using GitHubJwt;
using GlutenFreeMap.Backend.Domain;
using GlutenFreeMap.Backend.Helpers;
using Hangfire;
using Octokit;
using Octokit.Internal;
using System.Text;

namespace GlutenFreeMap.Backend.Integrations.GitHub;

public class GitHubOperations(IGitHubConfiguration configuration)
{
    private static readonly ProductHeaderValue productInformation = new("GlutenFreeMap");

    private static readonly IReadOnlySet<string> topLevelFiles = new HashSet<string>(4)
    {
        "languages.json",
        "attestations.json",
        "regions.json",
        "categories.json",
        "info.json",
    };

    [AutomaticRetry(Attempts = 1)]
    public async Task AddRepository(InstallationIdentifier installation, RepositoryIdentifier repositoryId, RepositoryName fullName, CancellationToken cancellationToken)
    {
        var client = await GetInstallationClient(installation, cancellationToken);

        var repository = await client.Repository.Get(repositoryId);
        var defaultBranch = new GitReference($"refs/heads/{repository.DefaultBranch}");

        var reference = await client.Git.Reference.Get(repositoryId, defaultBranch);
        if (reference.Object.Type.Value != TaggedType.Commit)
        {
            throw new NotSupportedException($"I don't know how to process a reference to an object of type '{reference.Object.Type.Value}'.");
        }

        var commit = new CommitIdentifier(reference.Object.Sha);

        var tree = await client.Git.Tree.GetRecursive(repositoryId, commit);
        if (tree.Truncated)
        {
            throw new NotSupportedException("The tree was truncated and no alternative method has been implemented yet.");
        }

        var filesToDownload = new List<TreeItem>(tree.Tree.Count);
        var magicFileFound = false;

        foreach (var item in tree.Tree)
        {
            if (item.Type.Value != TreeType.Blob)
            {
                continue;
            }

            switch (item.Path)
            {
                // Check that the repository is valid by looking for a magic file.
                case ".glutenfreemap":
                    magicFileFound = true;
                    break;

                case string path when topLevelFiles.Contains(path) || path.StartsWith("places/"):
                    filesToDownload.Add(item);
                    break;

                    // Ignore other files
            }
        }

        if (!magicFileFound)
        {
            throw new InvalidOperationException("This doesn't look like a GlutenFreeMap repository.");
        }

        using var baseDir = GetRepositoryDir(repositoryId, fullName);
        await baseDir.UpdateAsync(async (tempPath, _, ct) =>
        {
            foreach (var fileToDownload in filesToDownload)
            {
                await DownloadFile(client, repositoryId, tempPath, fileToDownload.Path, new(fileToDownload.Sha), ct);
            }

            WriteMetadata(tempPath, new RepositoryMetadata(
                defaultBranch,
                commit
            ));
        }, cancellationToken);
    }

    private static async Task DownloadFile(
        GitHubClient client,
        RepositoryIdentifier repositoryId,
        string outputBasePath,
        string repositoryFilePath,
        GitFileIdentifier repositoryFileSha,
        CancellationToken cancellationToken
    )
    {
        var filePath = Path.Combine(outputBasePath, repositoryFilePath);
        var fileDir = Path.GetDirectoryName(filePath)!;
        if (!Directory.Exists(fileDir))
        {
            Directory.CreateDirectory(fileDir);
        }

        var fileContent = await client.Git.Blob.Get(repositoryId, repositoryFileSha);

        var fileBytes = fileContent.Encoding.Value switch
        {
            EncodingType.Utf8 => Encoding.UTF8.GetBytes(fileContent.Content),
            EncodingType.Base64 => Convert.FromBase64String(fileContent.Content),
            _ => throw new NotSupportedException($"Unsupported encoding'{fileContent.Encoding.Value}'.")
        };

        await File.WriteAllBytesAsync(filePath, fileBytes, cancellationToken);
        Json.Write(filePath + ".metadata", new GitFileMetadata(repositoryFileSha));
    }

    [AutomaticRetry(Attempts = 1)]
    public Task RemoveRepository(InstallationIdentifier installation, RepositoryIdentifier repositoryId, RepositoryName fullName, CancellationToken cancellationToken)
    {
        using var baseDir = GetRepositoryDir(repositoryId, fullName);
        Directory.Delete(baseDir.Path, recursive: true);

        return Task.CompletedTask;
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task UpdateRepository(InstallationIdentifier installation, RepositoryIdentifier repositoryId, RepositoryName fullName, GitReference reference, CommitIdentifier commit, CancellationToken cancellationToken)
    {
        using var baseDir = GetRepositoryDir(repositoryId, fullName);
        var metadata = ReadMetadata(baseDir.Path);
        if (metadata.Branch != reference)
        {
            return;
        }

        var client = await GetInstallationClient(installation, cancellationToken);

        await baseDir.UpdateAsync(async (tempPath, originalPath, ct) =>
        {
            const int pageSize = 100;

            CompareResult diff;
            var page = 0;
            do
            {
                ++page;
                diff = await client.Repository.Commit.Compare(repositoryId, metadata.Commit, commit, new ApiOptions
                {
                    StartPage = page,
                    PageSize = pageSize,
                });

                foreach (var file in diff.Files)
                {
                    var targetFilePath = Path.Combine(tempPath, file.Filename);

                    switch (file.Status)
                    {
                        case "added":
                        case "modified":
                        case "renamed": // A renamed file may also be modified, so we download it
                            if (file.Status == "renamed")
                            {
                                var previousFilePath = Path.Combine(tempPath, file.PreviousFileName);
                                File.Delete(previousFilePath);
                            }

                            await DownloadFile(client, repositoryId, tempPath, file.Filename, new(file.Sha), ct);

                            // Download the new file
                            break;

                        case "removed":
                            File.Delete(targetFilePath);
                            break;

                        // These do not seem to be returned ever
                        case "copied":
                        case "changed":
                        case "unchanged":
                        default:
                            throw new NotSupportedException($"Unexpected file status '{file.Status}'.");
                    }
                }
            } while (diff.Files.Count == pageSize);

            WriteMetadata(tempPath, new RepositoryMetadata(
                metadata.Branch,
                commit
            ));
        }, cancellationToken);
    }

    private static RepositoryMetadata ReadMetadata(string path)
    {
        return Json.Read<RepositoryMetadata>(Path.Combine(path, ".metadata"));
    }

    private static void WriteMetadata(string path, RepositoryMetadata metadata)
    {
        Json.Write(Path.Combine(path, ".metadata"), metadata);
    }

    private static AtomicDirectory GetRepositoryDir(RepositoryIdentifier repositoryId, RepositoryName fullName)
    {
        return new AtomicDirectory(Path.Combine("repos", $"github.{fullName.Owner}.{fullName.Name}"));
    }

    private sealed class CancellableHttpHandler(IHttpClient httpClient, CancellationToken cancellationToken) : IHttpClient
    {
        public Task<IResponse> Send(IRequest request, CancellationToken _cancellationToken, Func<object, object> preprocessResponseBody = null!)
            => httpClient.Send(request, cancellationToken, preprocessResponseBody);

        public void SetRequestTimeout(TimeSpan timeout) => httpClient.SetRequestTimeout(timeout);
        public void Dispose() => httpClient.Dispose();
    }

    private async Task<GitHubClient> GetInstallationClient(InstallationIdentifier installation, CancellationToken cancellationToken)
    {
        var tokenGenerator = new GitHubJwtFactory(
            new StringPrivateKeySource(configuration.PrivateKey),
            new GitHubJwtFactoryOptions
            {
                AppIntegrationId = configuration.AppId, // The GitHub App Id
                ExpirationSeconds = 600 // 10 minutes is the maximum time allowed
            }
        );

        var jwtToken = tokenGenerator.CreateEncodedJwtToken();

        var connection = new Connection(
            productInformation,
            new CancellableHttpHandler(
                new HttpClientAdapter(HttpMessageHandlerFactory.CreateDefault),
                cancellationToken
            )
        );

        var appClient = new GitHubClient(connection)
        {
            Credentials = new Credentials(jwtToken, AuthenticationType.Bearer),
        };

        var installationToken = await appClient.GitHubApps.CreateInstallationToken(installation.Id);

        var installationClient = new GitHubClient(connection)
        {
            Credentials = new Credentials(installationToken.Token, AuthenticationType.Bearer),
        };
        return installationClient;
    }
}

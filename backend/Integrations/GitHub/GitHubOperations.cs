using GitHubJwt;
using GlutenFreeMap.Backend.Domain;
using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.Git;
using GlutenFreeMap.Backend.Integrations.Hangfire;
using Hangfire;
using Octokit;
using Octokit.Internal;
using System;
using System.IO;
using System.Text;

namespace GlutenFreeMap.Backend.Integrations.GitHub;

public class GitHubOperations(IGitHubConfiguration configuration)
{
    private static readonly ProductHeaderValue productInformation = new("GlutenFreeMap");

    [AutomaticRetry(Attempts = 1)]
    public async Task AddRepository(InstallationIdentifier installation, RepositoryIdentifier repositoryId, RepositoryName fullName, CancellationToken cancellationToken)
    {
        var (client, token) = await GetInstallationClient(installation, cancellationToken);
        var repository = await client.Repository.Get(repositoryId);

        new ReporitoryOperations().CloneRepository(
            GetRepositoryPath(fullName),
            new(repository.CloneUrl),
            new(repository.DefaultBranch),
            new LibGit2Sharp.UsernamePasswordCredentials
            {
                Username = "git",
                Password = token.Token,
            }
        );
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
        AtomicDirectory.DeleteDirectory(baseDir.Path);

        return Task.CompletedTask;
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task UpdateRepository(InstallationIdentifier installation, RepositoryIdentifier repositoryId, RepositoryName fullName, GitReference reference, CommitIdentifier commit, CancellationToken cancellationToken)
    {
        new ReporitoryOperations().CloneRepository

        using var baseDir = GetRepositoryDir(repositoryId, fullName);
        var metadata = ReadMetadata(baseDir.Path);
        if (metadata.Branch != reference)
        {
            return;
        }

        var (client, _) = await GetInstallationClient(installation, cancellationToken);

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
        return new AtomicDirectory(GetRepositoryPath(fullName));
    }

    private static string GetRepositoryPath(RepositoryName fullName)
    {
        return Path.Combine("repos", $"github.{fullName.Owner}.{fullName.Name}");
    }

    private sealed class CancellableHttpHandler(IHttpClient httpClient, CancellationToken cancellationToken) : IHttpClient
    {
        public Task<IResponse> Send(IRequest request, CancellationToken _cancellationToken, Func<object, object> preprocessResponseBody = null!)
            => httpClient.Send(request, cancellationToken, preprocessResponseBody);

        public void SetRequestTimeout(TimeSpan timeout) => httpClient.SetRequestTimeout(timeout);
        public void Dispose() => httpClient.Dispose();
    }

    private async Task<(GitHubClient client, AccessToken installationToken)> GetInstallationClient(InstallationIdentifier installation, CancellationToken cancellationToken)
    {
        var (installationToken, connection) = await GetInstallationToken(installation, cancellationToken);

        var installationClient = new GitHubClient(connection)
        {
            Credentials = new Credentials(installationToken.Token, AuthenticationType.Bearer),
        };
        return (installationClient, installationToken);
    }

    private async Task<(AccessToken installationToken, Connection connection)> GetInstallationToken(InstallationIdentifier installation, CancellationToken cancellationToken)
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
        return (installationToken, connection);
    }
}

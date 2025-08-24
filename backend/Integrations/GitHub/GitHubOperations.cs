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
        using var baseDir = new AtomicDirectory(GetRepositoryPath(fullName));
        AtomicDirectory.DeleteDirectory(baseDir.Path);

        return Task.CompletedTask;
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task UpdateRepository(InstallationIdentifier installation, RepositoryIdentifier repositoryId, RepositoryName fullName, GitReference reference, CommitIdentifier commit, CancellationToken cancellationToken)
    {
        var (client, token) = await GetInstallationClient(installation, cancellationToken);
        var repository = await client.Repository.Get(repositoryId);

        new ReporitoryOperations().UpdateRepository(
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

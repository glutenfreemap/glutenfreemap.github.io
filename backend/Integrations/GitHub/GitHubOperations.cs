using GitHubJwt;
using GlutenFreeMap.Backend.Controllers;
using Microsoft.Extensions.Configuration;
using Octokit;

namespace GlutenFreeMap.Backend.Integrations.GitHub;

public class GitHubOperations(IGitHubConfiguration configuration)
{
    public async Task AddRepository(InstallationIdentifier installation, RepositoryIdentifier repository, RepositoryName fullName, CancellationToken cancellationToken)
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

        var appClient = new GitHubClient(new ProductHeaderValue("GlutenFreeMap"))
        {
            Credentials = new Credentials(jwtToken, AuthenticationType.Bearer)
        };

        var installationToken = await appClient.GitHubApps.CreateInstallationToken(installation.Id);
    }

    public async Task RemoveRepository()
    {

    }
}

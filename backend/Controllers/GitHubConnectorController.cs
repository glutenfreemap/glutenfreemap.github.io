using GitHubJwt;
using GlutenFreeMap.Backend.Helpers;
using Microsoft.AspNetCore.Mvc;
using Octokit;
using System.ComponentModel.DataAnnotations;

namespace GlutenFreeMap.Backend.Controllers
{
    [ApiController]
    [Route("connector/github")]
    public class GitHubConnectorController(IConfiguration configuration) : ControllerBase
    {
        [HttpGet]
        public async Task<string> Get()
        {
            var config = configuration
                .GetSection("Connectors")
                .GetSection("GitHub")
                .GetAndValidate<GitHubConfiguration>();

            var generator = new GitHubJwt.GitHubJwtFactory(
                new StringPrivateKeySource(config.PrivateKey),
                new GitHubJwtFactoryOptions
                {
                    AppIntegrationId = config.AppId, // The GitHub App Id
                    ExpirationSeconds = 600 // 10 minutes is the maximum time allowed
                }
            );

            var jwtToken = generator.CreateEncodedJwtToken();

            var appClient = new GitHubClient(new ProductHeaderValue("GlutenFreeMap"))
            {
                Credentials = new Credentials(jwtToken, AuthenticationType.Bearer)
            };

            appClient.GitHubApps.CreateInstallationToken()

            var installations = await appClient.GitHubApps.GetAllInstallationsForCurrent();

            var x = await appClient.GitHubApps.Installation.GetAllRepositoriesForCurrent();

            return "";

            //var github = new GitHubAppsClient(IApiConnection)
        }
    }

#nullable disable warnings
    public sealed class GitHubConfiguration
    {
        [Range(1, int.MaxValue)]
        public int AppId { get; set; }

        [Required, MinLength(1)]
        public string ClientId { get; set; }

        [Required, MinLength(1)]
        public string ClientSecret { get; set; }

        [Required, MinLength(1)]
        public string PrivateKey { get; set; }
    }

}

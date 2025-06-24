using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.GitHub;
using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ActionConstraints;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Routing;
using Newtonsoft.Json;
using Octokit;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text;

namespace GlutenFreeMap.Backend.Controllers
{
    [ApiController]
    [Route("connector/github")]
    public class GitHubConnectorController(ILogger<GitHubConnectorController> logger) : ControllerBase
    {
        [HttpGet]
        public async Task<string> Get()
        {
            //var generator = new GitHubJwt.GitHubJwtFactory(
            //    new StringPrivateKeySource(configuration.PrivateKey),
            //    new GitHubJwtFactoryOptions
            //    {
            //        AppIntegrationId = configuration.AppId, // The GitHub App Id
            //        ExpirationSeconds = 600 // 10 minutes is the maximum time allowed
            //    }
            //);

            //var jwtToken = generator.CreateEncodedJwtToken();

            //var appClient = new GitHubClient(new ProductHeaderValue("GlutenFreeMap"))
            //{
            //    Credentials = new Credentials(jwtToken, AuthenticationType.Bearer)
            //};


            //var installations = await appClient.GitHubApps.GetAllInstallationsForCurrent();

            //var installationToken = await appClient.GitHubApps.CreateInstallationToken(installations.First().Id);

            //var installationClient = new GitHubClient(new ProductHeaderValue("GlutenFreeMap"))
            //{
            //    Credentials = new Credentials(installationToken.Token, AuthenticationType.Bearer)
            //};

            //var x = await installationClient.GitHubApps.Installation.GetAllRepositoriesForCurrent();

            return "";

            //var github = new GitHubAppsClient(IApiConnection)
        }

        [WebhookMethod("installation")]
        public IActionResult Webhook([FromBody] InstallationWebhookPayload payload)
        {
            switch (payload.Action)
            {
                case "created":
                case "suspend":
                    foreach (var repository in payload.Repositories)
                    {
                        BackgroundJob.Enqueue<GitHubOperations>(op => op.AddRepository(payload.Installation.Id, repository.Id, repository.FullName, default));
                    }
                    break;

                case "deleted":
                case "unsuspend":
                    break;

                case "new_permissions_accepted":
                default:
                    return BadRequest();
            }
            return Ok();
        }

        [WebhookMethod("installation_repositories")]
        public IActionResult Webhook([FromBody] InstallationRepositoriesWebhookPayload payload)
        {
            //BackgroundJob.Enqueue(() => Handle(payload, default));
            return Ok();
        }

        [AttributeUsage(AttributeTargets.Method)]
        private sealed class WebhookMethodAttribute(string eventType)
            : Attribute
            , IActionConstraint
            , IActionHttpMethodProvider
            , IRouteTemplateProvider
            , IFilterFactory
        {
            int IActionConstraint.Order => 0;

            bool IActionConstraint.Accept(ActionConstraintContext context)
            {
                return context.RouteContext.HttpContext.Request.Headers.TryGetSingleValue("X-GitHub-Event", out var currentEventType)
                    && currentEventType == eventType;
            }

            private static readonly IEnumerable<string> _supportedMethods = ["POST"];
            IEnumerable<string> IActionHttpMethodProvider.HttpMethods => _supportedMethods;

            string? IRouteTemplateProvider.Template => "webhook";
            int? IRouteTemplateProvider.Order => null;
            string? IRouteTemplateProvider.Name => null;

            bool IFilterFactory.IsReusable => true;

            IFilterMetadata IFilterFactory.CreateInstance(IServiceProvider serviceProvider)
            {
                return new WebhookMethodFilter(serviceProvider.GetRequiredService<IGitHubConfiguration>());
            }
        }
        
        private sealed class WebhookMethodFilter(IGitHubConfiguration configuration) : IAsyncAuthorizationFilter
        {
            async Task IAsyncAuthorizationFilter.OnAuthorizationAsync(AuthorizationFilterContext context)
            {
                if (!await ValidateRequest(context.HttpContext.Request, context.HttpContext.RequestAborted))
                {
                    context.Result = new StatusCodeResult(StatusCodes.Status400BadRequest);
                }
            }

            private async Task<bool> ValidateRequest(HttpRequest request, CancellationToken cancellationToken)
            {
                const string signaturePrefix = "sha256=";

                if (!request.Headers.TryGetSingleValue("X-Hub-Signature-256", out var signature))
                {
                    return false;
                }

                if (signature is null || !signature.StartsWith(signaturePrefix) || signature.Length != signaturePrefix.Length + 64)
                {
                    return false;
                }

                var signatureBytes = Convert.FromHexString(signature.AsSpan(signaturePrefix.Length));

                var contentLength = request.ContentLength;
                if (contentLength is null || contentLength.Value > 25 * 1024 * 1024)
                {
                    return false;
                }

                var requestBody = new MemoryStream();
                await request.Body.CopyToAsync(requestBody, cancellationToken);
                requestBody.Position = 0;

                var expectedSignature = HMACSHA256.HashData(configuration.WebhookSecret, requestBody);
                var signaturesMatch = CryptographicOperations.FixedTimeEquals(expectedSignature, signatureBytes);
                if (!signaturesMatch)
                {
                    return false;
                }

                requestBody.Position = 0;
                request.Body = requestBody;

                return true;
            }
        }
    }
}

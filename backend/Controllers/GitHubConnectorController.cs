using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.GitHub;
using Hangfire;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ActionConstraints;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Routing;
using System.Security.Cryptography;

namespace GlutenFreeMap.Backend.Controllers
{
    [ApiController]
    [Route("connector/github")]
    public class GitHubConnectorController(ILogger<GitHubConnectorController> logger) : ControllerBase
    {
        [WebhookMethod("installation")]
        public IActionResult Webhook([FromBody] InstallationWebhookPayload payload)
        {
            switch (payload.Action)
            {
                case "created":
                case "unsuspend":
                    foreach (var repository in payload.Repositories)
                    {
                        BackgroundJob.Enqueue<GitHubOperations>(op => op.AddRepository(
                            payload.Installation.Id,
                            repository.Id,
                            repository.FullName,
                            default
                        ));
                    }
                    break;

                case "deleted":
                case "suspend":
                    foreach (var repository in payload.Repositories)
                    {
                        BackgroundJob.Enqueue<GitHubOperations>(op => op.RemoveRepository(
                            repository.FullName,
                            default
                        ));
                    }
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
            switch (payload.Action)
            {
                case "added":
                    foreach (var repository in payload.RepositoriesAdded)
                    {
                        BackgroundJob.Enqueue<GitHubOperations>(op => op.AddRepository(payload.Installation.Id, repository.Id, repository.FullName, default));
                    }
                    break;

                case "removed":
                    foreach (var repository in payload.RepositoriesRemoved)
                    {
                        BackgroundJob.Enqueue<GitHubOperations>(op => op.RemoveRepository(repository.FullName, default));
                    }
                    break;

                default:
                    return BadRequest();
            }
            return Ok();
        }

        [WebhookMethod("push")]
        public IActionResult Webhook([FromBody] PushWebhookPayload payload)
        {
            BackgroundJob.Enqueue<GitHubOperations>(op => op.UpdateRepository(
                payload.Installation.Id,
                payload.Repository.Id,
                payload.Repository.FullName,
                payload.Ref,
                payload.After,
                default
            ));
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
                return new WebhookMethodFilter(
                    serviceProvider.GetRequiredService<IGitHubConfiguration>(),
                    serviceProvider.GetRequiredService<ILogger<WebhookMethodFilter>>()
                );
            }
        }
        
        private sealed class WebhookMethodFilter(IGitHubConfiguration configuration, ILogger<WebhookMethodFilter> logger) : IAsyncAuthorizationFilter
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
#if DEBUG
                    logger.LogDebug("Signature mismatch. Expected {signature}", Convert.ToHexString(expectedSignature).ToLowerInvariant());
#endif
                    return false;
                }

                requestBody.Position = 0;
                request.Body = requestBody;

                return true;
            }
        }
    }
}

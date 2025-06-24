using System.ComponentModel.DataAnnotations;
using System.Text;

namespace GlutenFreeMap.Backend.Integrations.GitHub;

public interface IGitHubConfiguration
{
    int AppId { get; }
    string ClientId { get; }
    string ClientSecret { get; }
    string PrivateKey { get; }
    byte[] WebhookSecret { get; }
}

#nullable disable warnings
public sealed class GitHubConfiguration : IGitHubConfiguration
{
    [Range(1, int.MaxValue)]
    public int AppId { get; set; }

    [Required, MinLength(1)]
    public string ClientId { get; set; }

    [Required, MinLength(1)]
    public string ClientSecret { get; set; }

    [Required, MinLength(1)]
    public string PrivateKey { get; set; }

    private string webhookSecret;
    private byte[] webhookSecretBytes;

    [Required, MinLength(1)]
    public string WebhookSecret
    {
        get => webhookSecret;
        set
        {
            webhookSecret = value;
            webhookSecretBytes = Encoding.UTF8.GetBytes(value);
        }
    }

    byte[] IGitHubConfiguration.WebhookSecret => webhookSecretBytes;
}
namespace GlutenFreeMap.Backend.Integrations.GitHub;

#nullable disable warnings

public class InstallationWebhookPayload
{
    public string Action { get; set; }
    public Installation Installation { get; set; }
    public IEnumerable<Repository> Repositories { get; set; }
}

public class InstallationRepositoriesWebhookPayload
{
    public string Action { get; set; }
    public Installation Installation { get; set; }
    public IEnumerable<Repository> RepositoriesAdded { get; set; }
    public IEnumerable<Repository> RepositoriesRemoved { get; set; }
}

public readonly record struct InstallationIdentifier(long Id);

public class Installation
{
    public InstallationIdentifier Id { get; set; }
    public string ClientId { get; set; }
}

public readonly record struct RepositoryIdentifier(long Id);
public readonly record struct RepositoryName(string FullName);

public class Repository
{
    public RepositoryIdentifier Id { get; set; }
    public string NodeId { get; set; }
    public string Name { get; set; }
    public RepositoryName FullName { get; set; }
    public bool Private { get; set; }
}

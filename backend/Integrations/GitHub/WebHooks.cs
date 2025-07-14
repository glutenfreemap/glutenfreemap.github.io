namespace GlutenFreeMap.Backend.Integrations.GitHub;

#nullable disable warnings

public record RepositoryMetadata(
    GitReference Branch,
    CommitIdentifier Commit
);

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

public class PushWebhookPayload
{
    public GitReference Ref { get; set; }
    public CommitIdentifier After { get; set; }
    public Installation Installation { get; set; }
    public Repository Repository { get; set; }
}

public readonly partial record struct InstallationIdentifier(int Id);

public class Installation
{
    public InstallationIdentifier Id { get; set; }
}

public class Commit
{
    public CommitIdentifier Id { get; set; }
    public TreeIdentifier TreeId { get; set; }
}

public readonly partial record struct CommitIdentifier(string Hash);
public readonly partial record struct TreeIdentifier(string Hash);

public readonly partial record struct RepositoryIdentifier(long Id);
public readonly partial record struct RepositoryName(string FullName)
{
    private readonly int splitIndex = FullName.IndexOf('/');

    public string Owner => FullName[..splitIndex];
    public string Name => FullName[(splitIndex + 1)..];
}

public readonly partial record struct GitReference(string Name);

public class Repository
{
    public RepositoryIdentifier Id { get; set; }
    public string NodeId { get; set; }
    public string Name { get; set; }
    public RepositoryName FullName { get; set; }
    public bool Private { get; set; }
}

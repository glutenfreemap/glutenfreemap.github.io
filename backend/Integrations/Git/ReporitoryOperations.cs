using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.GitHub;
using GlutenFreeMap.Backend.Integrations.Hangfire;
using Hangfire;
using LibGit2Sharp;
using System.Text.Json;
using System.Text.RegularExpressions;
using GitRepository = LibGit2Sharp.Repository;

namespace GlutenFreeMap.Backend.Integrations.Git;

public class ReporitoryOperations
{
    [AutomaticRetry(Attempts = 1)]
    public void CloneRepository(
        string path,
        Uri remoteUri,
        GitReference branch,
        Credentials credentials
    )
    {
        using var repositoryDir = new AtomicDirectory(path);

        var isEmpty = Directory.GetFileSystemEntries(path).Length == 0;
        if (!isEmpty)
        {
            throw new InvalidOperationException($"Directory '{path}' is not empty");
        }

        repositoryDir.Update((tempPath, originalPath) =>
        {
            var res = GitRepository.Clone(remoteUri.AbsoluteUri, Path.Combine(tempPath, ".git"), new(new()
            {
                CredentialsProvider = (url, usernameFromUrl, types) => credentials,
            })
            {
                BranchName = branch,
                IsBare = true,
            });
        });

        BackgroundJob.ContinueJobWith<ReporitoryOperations>(
            JobContext.JobId,
            op => op.ProcessRepository(path, default)
        );
    }

    [AutomaticRetry(Attempts = 1)]
    public void UpdateRepository(
        string path,
        Uri remoteUri,
        GitReference branch,
        Credentials credentials
    )
    {
        using var repositoryDir = new AtomicDirectory(path);

        var isEmpty = Directory.GetFileSystemEntries(path).Length == 0;
        if (!isEmpty)
        {
            throw new InvalidOperationException($"Directory '{path}' is not empty");
        }

        repositoryDir.Update((tempPath, originalPath) =>
        {
            using var repository = new GitRepository(Path.Combine(tempPath, ".git"));
            repository.Network.f
            //Commands.Pull(repository, )
            repository.Network.Fetch(remoteUri.AbsoluteUri, )

            var res = GitRepository.Clone(remoteUri.AbsoluteUri, Path.Combine(tempPath, ".git"), new(new()
            {
                CredentialsProvider = (url, usernameFromUrl, types) => credentials,
            })
            {
                BranchName = branch,
                IsBare = true,
            });
        });

        BackgroundJob.ContinueJobWith<ReporitoryOperations>(
            JobContext.JobId,
            op => op.ProcessRepository(path, default)
        );
    }

    private static readonly IReadOnlySet<string> topLevelFiles = new HashSet<string>
    {
        "languages.json",
        "attestations.json",
        "regions.json",
        "categories.json",
        "info.json",
    };

    [AutomaticRetry(Attempts = 1)]
    public async Task ProcessRepository(string path, CancellationToken cancellationToken)
    {
        using var repositoryDir = new AtomicDirectory(path);

        await repositoryDir.UpdateAsync(async (tempPath, originalPath, ct) =>
        {
            using var repository = new GitRepository(Path.Combine(tempPath, ".git"));
            var tree = repository.Head.Tip.Tree
                .Flatten(t => t.TargetType == TreeEntryTargetType.Tree ? (IEnumerable<TreeEntry>)t.Target : [])
                .Where(t => t.TargetType == TreeEntryTargetType.Blob)
                .Where(t => topLevelFiles.Contains(t.Path) || Regex.IsMatch(t.Path, @"^places\/([^\.]+\.json)$"))
                .Select(t => new { t.Path, Blob = (Blob)t.Target })
                .ToList();

            var placesPath = Path.Combine(tempPath, "places");
            if (Directory.Exists(placesPath))
            {
                AtomicDirectory.DeleteDirectory(placesPath);
            }
            Directory.CreateDirectory(placesPath);

            await using (var treeFile = File.Create(Path.Combine(tempPath, "tree.json")))
            {
                await JsonSerializer.SerializeAsync(
                    treeFile,
                    tree.Select(t => new { path = t.Path, hash = t.Blob.Sha }),
                    cancellationToken: ct
                );
            }

            foreach (var entry in tree)
            {
                using var contentStream = entry.Blob.GetContentStream();
                using var contentFile = File.Create(Path.Combine(tempPath, entry.Path));
                await contentStream.CopyToAsync(contentFile, ct);
            }
        }, cancellationToken);
    }
}

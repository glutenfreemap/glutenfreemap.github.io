using GlutenFreeMap.Backend.Controllers;
using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.Caching;
using GlutenFreeMap.Backend.Integrations.GitHub;
using LibGit2Sharp;
using Microsoft.AspNetCore.OutputCaching;
using GitRepository = LibGit2Sharp.Repository;

namespace GlutenFreeMap.Backend.Integrations.Git;

public class ReporitoryOperations(IOutputCacheStore cacheStore)
{
    public async Task CloneRepository(
        string path,
        Uri remoteUri,
        GitReference branch,
        Credentials credentials
    )
    {
        var isEmpty = Directory.GetFileSystemEntries(path).Length == 0;
        if (!isEmpty)
        {
            throw new InvalidOperationException($"Directory '{path}' is not empty");
        }

        var res = GitRepository.Clone(remoteUri.AbsoluteUri, path, new(new()
        {
            CredentialsProvider = (url, usernameFromUrl, types) => credentials,
        })
        {
            BranchName = branch,
            IsBare = true,
        });

        var parts = Path.GetFileName(path).Split('.');
        await cacheStore.EvictByTagAsync(RepositoryTreeOutputCachePolicy.GetCacheTag(parts[0], parts[1], parts[2]), default);
        await cacheStore.EvictByTagAsync(RepositoryController.RepositoryListCacheTagName, default);
    }

    public async Task UpdateRepository(
        string path,
        GitReference branch,
        Credentials credentials
    )
    {
        using var repository = new GitRepository(path);

        var remote = repository.Network.Remotes.First().Name;
        repository.Network.Fetch(remote, [branch], new FetchOptions
        {
            CredentialsProvider = (url, usernameFromUrl, types) => credentials
        });

        repository.Reset(ResetMode.Soft, $"{remote}/{branch}");

        var parts = Path.GetFileName(path).Split('.');
        await cacheStore.EvictByTagAsync(RepositoryTreeOutputCachePolicy.GetCacheTag(parts[0], parts[1], parts[2]), default);
        await cacheStore.EvictByTagAsync(RepositoryController.RepositoryListCacheTagName, default);
    }

    public async Task DeleteRepository(string path)
    {
        FileSystem.DeleteDirectory(path);

        var parts = Path.GetFileName(path).Split('.');
        await cacheStore.EvictByTagAsync(RepositoryController.RepositoryListCacheTagName, default);
    }
}

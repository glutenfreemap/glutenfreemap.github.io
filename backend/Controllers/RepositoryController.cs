using GlutenFreeMap.Backend.Domain;
using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.Caching;
using LibGit2Sharp;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using GitRepository = LibGit2Sharp.Repository;
using GitTreeEntry = LibGit2Sharp.TreeEntry;
using IOFile = System.IO.File;

namespace GlutenFreeMap.Backend.Controllers;

[ApiController]
[Route("repos")]
public class RepositoryController(ILogger<RepositoryController> logger) : ControllerBase
{
    public const string RepositoryListCacheTagName = "RepositoryList";

    [HttpGet]
    [OutputCache(Duration = 60, Tags = [RepositoryListCacheTagName])]
    public async Task<IEnumerable<Repository>> List(CancellationToken cancellationToken)
    {
        var repositories = new List<Repository>();

        foreach (var path in Directory.GetDirectories("repos"))
        {
            try
            {
                using var repository = new GitRepository(path);

                var info = repository.Head.Tip.Tree
                    .FirstOrDefault(t => t.TargetType == TreeEntryTargetType.Blob && t.Name == "info.json");

                if (info?.Target is Blob infoBlob)
                {
                    using var stream = infoBlob.GetContentStream();
                    var repositoryInfo = await JsonSerializer.DeserializeAsync<RepositoryInfo>(stream, cancellationToken: cancellationToken);
                    repositories.Add(new(
                        Path.GetFileName(path).Replace('.', '/'),
                        repositoryInfo!.Description
                    ));
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to read repository in {path}", path);
            }
        }

        return repositories;
    }

    private static readonly IReadOnlySet<string> topLevelFiles = new HashSet<string>
    {
        "languages.json",
        "attestations.json",
        "regions.json",
        "categories.json",
        "info.json",
    };

    [OutputCache(Duration = 60, PolicyName = RepositoryTreeOutputCachePolicy.Name)]
    [HttpGet(@"{provider:regex(\w+)}/{owner:regex(\w+)}/{name:regex(\w+)}/tree")]
    public IEnumerable<TreeEntry> GetTree(string provider, string owner, string name)
    {
        Response.Headers.ETag = $"\"{Guid.NewGuid():n}\"";

        logger.LogWarning("Getting repository tree {provider} {owner} {name}", provider, owner, name);

        var repositoryPath = Path.Combine("repos", $"{provider}.{owner}.{name}");
        using var repository = new GitRepository(repositoryPath);

        var tree = repository.Head.Tip.Tree
            .Flatten(t => t.TargetType == TreeEntryTargetType.Tree ? (IEnumerable<GitTreeEntry>)t.Target : [])
            .Where(t => t.TargetType == TreeEntryTargetType.Blob)
            .Where(t => topLevelFiles.Contains(t.Path) || Regex.IsMatch(t.Path, @"^places\/([^\.]+\.json)$"))
            .Select(t => new TreeEntry(t.Path, new(((Blob)t.Target).Sha)))
            .ToList();

        return tree;
    }

    [OutputCache(Duration = 60 * 24 * 365, PolicyName = RepositoryTreeOutputCachePolicy.Name)]
    [ResponseCache(Duration = 60 * 24 * 365, Location = ResponseCacheLocation.Any)]
    [HttpGet(@"{provider:regex(\w+)}/{owner:regex(\w+)}/{name:regex(\w+)}/blobs/{hash}")]
    public IActionResult GetBlobByHash(string provider, string owner, string name, string hash)
    {
        var repositoryPath = Path.Combine("repos", $"{provider}.{owner}.{name}");
        using var repository = new GitRepository(repositoryPath);

        if (repository.Lookup(hash, ObjectType.Blob) is Blob blob)
        {
            return File(blob.GetContentStream(), "application/json");
        }
        else
        {
            return NotFound();
        }
    }

    [HttpGet(@"{provider:regex(\w+)}/{owner:regex(\w+)}/{name:regex(\w+)}/blob/{**path:regex([[\w\-/]]+\.json)}")]
    public IActionResult GetBlob(string provider, string owner, string name, string path)
    {
        var filePath = Path.Combine("repos", $"{provider}.{owner}.{name}", path);
        if (!IOFile.Exists(filePath))
        {
            return NotFound();
        }

        var file = IOFile.OpenRead(filePath);
        return File(file, "application/json");
    }
}

public record Repository(
    string Path,
    Dictionary<string, string> Description
);

public record RepositoryInfo(
    [property:JsonPropertyName("description")] Dictionary<string, string> Description
);

public record TreeEntry(
    string Path,
    GitFileIdentifier Hash
);

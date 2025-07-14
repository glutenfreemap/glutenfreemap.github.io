using GlutenFreeMap.Backend.Domain;
using GlutenFreeMap.Backend.Helpers;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using IOFile = System.IO.File;

namespace GlutenFreeMap.Backend.Controllers;

[ApiController]
[Route("repo")]
public class RepositoryController : ControllerBase
{
    [HttpGet]
    public IEnumerable<Repository> List()
    {
        return Directory.GetDirectories("repos")
            .Select(d => new
            {
                Path = d,
                InfoFileName = Path.Combine(d, "info.json")
            })
            .Where(r => IOFile.Exists(r.InfoFileName))
            .Select(r => new Repository(
                r.Path,
                Json.Read<RepositoryInfo>(r.InfoFileName).Description
            ));
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

    [HttpGet(@"{provider:regex(\w+)}/{owner:regex(\w+)}/{name:regex(\w+)}/tree")]
    public ActionResult<IEnumerable<TreeEntry>> GetTree(string provider, string owner, string name)
    {
        var path = Path.Combine("repos", $"{provider}.{owner}.{name}");
        if (!Directory.Exists(path))
        {
            return NotFound();
        }

        var files = Directory.GetFiles(path, "*.json", SearchOption.AllDirectories);
        var tree = new List<TreeEntry>(files.Length);

        foreach (var file in files)
        {
            var metadataFile = file + ".metadata";
            if (IOFile.Exists(metadataFile))
            {
                var relativePath = file[(path.Length + 1)..];
                if (Path.DirectorySeparatorChar != '/')
                {
                    relativePath = relativePath.Replace(Path.DirectorySeparatorChar, '/');
                }

                var metadata = Json.Read<GitFileMetadata>(metadataFile);
                tree.Add(new(
                    relativePath,
                    metadata.Hash
                ));
            }
        }

        return tree;
    }
}

public record Repository(
    string Path,
    Dictionary<string, string> Description
);

public record RepositoryInfo(
    Dictionary<string, string> Description
);

public record TreeEntry(
    string Path,
    GitFileIdentifier Hash
);

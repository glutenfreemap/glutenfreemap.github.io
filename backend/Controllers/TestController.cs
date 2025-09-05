using GlutenFreeMap.Backend.Integrations.Caching;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace GlutenFreeMap.Backend.Controllers;

[Route("test")]
public class TestController(IOutputCacheStore cacheStore) : ControllerBase
{
    [HttpPost(@"repos/invalidate")]
    public async Task<IActionResult> InvalidateRepositoryList(CancellationToken cancellationToken)
    {
        await cacheStore.EvictByTagAsync(RepositoryController.RepositoryListCacheTagName, cancellationToken);
        return Ok();
    }

    [HttpPost(@"{provider:regex(\w+)}/{owner:regex(\w+)}/{name:regex(\w+)}/invalidate")]
    public async Task<IActionResult> InvalidateTree(string provider, string owner, string name, CancellationToken cancellationToken)
    {
        var tag = RepositoryTreeOutputCachePolicy.GetCacheTag(provider, owner, name);
        await cacheStore.EvictByTagAsync(tag, cancellationToken);
        return Ok();
    }
}

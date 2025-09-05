using Microsoft.AspNetCore.OutputCaching;

namespace GlutenFreeMap.Backend.Integrations.Caching;

public sealed class RepositoryTreeOutputCachePolicy : IOutputCachePolicy
{
    public const string Name = "RepositoryTree";

    public ValueTask CacheRequestAsync(OutputCacheContext context, CancellationToken cancellation)
    {
        context.EnableOutputCaching = true;
        context.AllowCacheLookup = true;
        context.AllowCacheStorage = true;
        context.AllowLocking = true;

        var tag = GetCacheTag(
            (string)context.HttpContext.GetRouteValue("provider")!,
            (string)context.HttpContext.GetRouteValue("owner")!,
            (string)context.HttpContext.GetRouteValue("name")!
        );

        context.Tags.Add(tag);

        return ValueTask.CompletedTask;
    }

    public static string GetCacheTag(string provider, string owner, string name)
    {
        return string.Join('.', provider, owner, name);
    }

    public ValueTask ServeFromCacheAsync(OutputCacheContext context, CancellationToken cancellation)
    {
        return ValueTask.CompletedTask;
    }

    public ValueTask ServeResponseAsync(OutputCacheContext context, CancellationToken cancellation)
    {
        return ValueTask.CompletedTask;
    }
}

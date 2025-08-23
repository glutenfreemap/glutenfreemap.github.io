using Hangfire.Server;

namespace GlutenFreeMap.Backend.Integrations.Hangfire;

public sealed class JobContext : IServerFilter
{
    private static readonly AsyncLocal<string?> jobId = new();

    public static string JobId => jobId.Value ?? throw new InvalidOperationException("No job is currently running");

    public void OnPerforming(PerformingContext context)
    {
        jobId.Value = context.BackgroundJob.Id;
    }

    public void OnPerformed(PerformedContext filterContext)
    {
        jobId.Value = null;
    }
}
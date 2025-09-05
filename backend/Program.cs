using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.Caching;
using GlutenFreeMap.Backend.Integrations.Git;
using GlutenFreeMap.Backend.Integrations.GitHub;
using GlutenFreeMap.Backend.Integrations.Hangfire;
using Hangfire;
using Hangfire.Storage.SQLite;
using Microsoft.Extensions.Caching.Memory;
using SQLite;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

const string CorsPolicyName = "ConfiguredAllowedOrigins";

var allowedOrigins = builder.Configuration.GetRequiredSection("AllowedOrigins").Get<string[]>();
if (allowedOrigins is not null && allowedOrigins.Length > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(CorsPolicyName, policy => policy
            .WithOrigins(allowedOrigins)
        );
    });
}

builder.Services.AddHangfire(c => c
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSQLiteStorage(new SQLiteDbConnectionFactory(() => new SQLiteConnection(
        databasePath: "db/backend.db",
        openFlags: SQLiteOpenFlags.ReadWrite | SQLiteOpenFlags.Create | SQLiteOpenFlags.FullMutex,
        storeDateTimeAsTicks: true
    )
    {
        BusyTimeout = TimeSpan.FromSeconds(value: 10)
    }))
    .UseFilter(new JobContext())
);

builder.Services.AddHangfireServer();

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    });

builder.Services.AddSingleton<IGitHubConfiguration>(builder.Configuration
    .GetSection("Connectors")
    .GetSection("GitHub")
    .GetAndValidate<GitHubConfiguration>()
);

builder.Services.AddOutputCache(options =>
{
    options.AddPolicy(RepositoryTreeOutputCachePolicy.Name, new RepositoryTreeOutputCachePolicy());
});

builder.Services.AddResponseCaching();

builder.Services.AddSingleton<ReporitoryOperations>();

var app = builder.Build();

// Configure the HTTP request pipeline.

if (allowedOrigins is not null && allowedOrigins.Length > 0)
{
    app.UseCors(CorsPolicyName);
}
;

app.UseHangfireDashboard();
app.UseHttpsRedirection();
app.UseOutputCache();
app.UseResponseCaching();
app.MapControllers();

app.Run();

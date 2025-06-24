using GlutenFreeMap.Backend.Helpers;
using GlutenFreeMap.Backend.Integrations.GitHub;
using Hangfire;
using Hangfire.Storage.SQLite;
using SQLite;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

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
);

builder.Services.AddHangfireServer();

builder.Services
    .AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
        o.JsonSerializerOptions.Converters.Add(new IdentifierJsonConverter());
    });

builder.Services.AddSingleton<IGitHubConfiguration>(builder.Configuration
    .GetSection("Connectors")
    .GetSection("GitHub")
    .GetAndValidate<GitHubConfiguration>()
);

var app = builder.Build();

// Configure the HTTP request pipeline.

app.UseHangfireDashboard();
app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();

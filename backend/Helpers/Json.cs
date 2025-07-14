using Newtonsoft.Json;

namespace GlutenFreeMap.Backend.Helpers;

public static class Json
{
    public static T Read<T>(string path)
    {
        using var file = File.OpenText(path);
        using var reader = new JsonTextReader(file);

        var serializer = new JsonSerializer();
        return serializer.Deserialize<T>(reader);
    }

    public static void Write<T>(string path, T metadata)
    {
        using var file = File.CreateText(path);
        using var writer = new JsonTextWriter(file);

        var serializer = new JsonSerializer
        {
            Formatting = Formatting.Indented
        };

        serializer.Serialize(writer, metadata);
    }
}

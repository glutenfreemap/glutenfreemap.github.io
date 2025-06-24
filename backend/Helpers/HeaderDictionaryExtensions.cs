using System.Diagnostics.CodeAnalysis;

namespace GlutenFreeMap.Backend.Helpers;

public static class HeaderDictionaryExtensions
{
    public static bool TryGetSingleValue(this IHeaderDictionary headers, string key, [NotNullWhen(true)] out string? value)
    {
        if (headers.TryGetValue(key, out var header) && header.Count == 1)
        {
            value = header[0];
            return value is not null;
        }
        else
        {
            value = default;
            return false;
        }
    }

    public static bool TryGetSingleValue<T>(this IHeaderDictionary headers, string key, [MaybeNullWhen(false)] out T value)
    {
        if (headers.TryGetSingleValue(key, out var header))
        {
            value = (T)Convert.ChangeType(header, typeof(T))!;
            return true;
        }
        else
        {
            value = default;
            return false;
        }
    }
}

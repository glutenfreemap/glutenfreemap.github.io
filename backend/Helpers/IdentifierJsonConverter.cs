using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GlutenFreeMap.Backend.Helpers;

public class IdentifierJsonConverter : JsonConverterFactory
{
    private readonly ConcurrentDictionary<Type, JsonConverter?> knownTypes = new();

    public override bool CanConvert(Type typeToConvert)
    {
        return typeToConvert.IsValueType
            && typeToConvert.GetCustomAttributes(typeof(System.Runtime.CompilerServices.IsReadOnlyAttribute), false).Any()
            && knownTypes.GetOrAdd(typeToConvert, TryCreateConverter) != null;
    }

    private JsonConverter? TryCreateConverter(Type typeToConvert)
    {
        var constructors = typeToConvert.GetConstructors();
        if (constructors.Length != 1)
        {
            return null;
        }

        var constructor = constructors[0];
        var parameters = constructor.GetParameters();
        if (parameters.Length != 1)
        {
            return null;
        }

        if (!jsonReaders.TryGetValue(parameters[0].ParameterType, out var jsonMethods))
        {
            return null;
        }

        var properties = typeToConvert.GetProperties(BindingFlags.Instance | BindingFlags.Public);
        if (properties.Length != 1)
        {
            return null;
        }

        var property = properties[0];
        if (property.PropertyType != parameters[0].ParameterType)
        {
            return null;
        }

        return (JsonConverter?)createConverterMethod.MakeGenericMethod(typeToConvert, property.PropertyType).Invoke(null, [constructor, property, jsonMethods.reader, jsonMethods.writer]);
    }

    private static readonly MethodInfo createConverterMethod = typeof(IdentifierJsonConverter).GetMethod(nameof(CreateConverter), BindingFlags.Static | BindingFlags.NonPublic)
        ?? throw new MissingMemberException("Missing method CreateConverter");

    private static readonly Dictionary<Type, (MethodInfo reader, MethodInfo writer)> jsonReaders = new[]
        {
            (reader: nameof(Utf8JsonReader.GetInt64), writer: nameof(Utf8JsonWriter.WriteNumberValue)),
            (reader: nameof(Utf8JsonReader.GetInt32), writer: nameof(Utf8JsonWriter.WriteNumberValue)),
            (reader: nameof(Utf8JsonReader.GetString), writer: nameof(Utf8JsonWriter.WriteStringValue)),
        }
        .Select(n =>
        {
            var jsonReader = typeof(Utf8JsonReader).GetMethod(n.reader, BindingFlags.Instance | BindingFlags.Public) ?? throw new MissingMemberException($"Missing method Utf8JsonReader.{n}");
            var jsonWriter = typeof(Utf8JsonWriter).GetMethod(n.writer, BindingFlags.Instance | BindingFlags.Public, [jsonReader.ReturnType]) ?? throw new MissingMemberException($"Missing method Utf8JsonReader.{n}");
            return (jsonReader, jsonWriter);
        })
        .ToDictionary(m => m.jsonReader.ReturnType);

    private static Converter<TIdentifier, TKey> CreateConverter<TIdentifier, TKey>(ConstructorInfo constructor, PropertyInfo property, MethodInfo jsonReader, MethodInfo jsonWriter)
    {
        var writerParam = Expression.Parameter(typeof(Utf8JsonWriter), "writer");
        var identifierParam = Expression.Parameter(typeof(TIdentifier), "value");

        var write = Expression.Lambda<Action<Utf8JsonWriter, TIdentifier>>(
            Expression.Call(
                writerParam,
                jsonWriter,
                Expression.Property(identifierParam, property)
            ),
            writerParam,
            identifierParam
        );

        var readerParam = Expression.Parameter(typeof(Utf8JsonReader).MakeByRefType(), "reader");
        var read = Expression.Lambda<ReadDelegate<TIdentifier, TKey>>(
            Expression.New(
                constructor,
                Expression.Call(readerParam, jsonReader)
            ),
            readerParam
        );

        return new Converter<TIdentifier, TKey>(read.Compile(), write.Compile());
    }

    private delegate TIdentifier ReadDelegate<TIdentifier, TKey>(ref Utf8JsonReader reader);

    public override JsonConverter? CreateConverter(Type typeToConvert, JsonSerializerOptions options)
    {
        return knownTypes.GetOrAdd(typeToConvert, TryCreateConverter);
    }

    private sealed class Converter<TIdentifier, TKey>(ReadDelegate<TIdentifier, TKey> read, Action<Utf8JsonWriter, TIdentifier> write) : JsonConverter<TIdentifier>
    {
        public override TIdentifier? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return read(ref reader);
        }

        public override void Write(Utf8JsonWriter writer, TIdentifier value, JsonSerializerOptions options)
        {
            write(writer, value);
        }
    }
}

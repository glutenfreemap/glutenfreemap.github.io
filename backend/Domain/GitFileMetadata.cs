namespace GlutenFreeMap.Backend.Domain;

public readonly partial record struct GitFileIdentifier(string Hash);

public record GitFileMetadata(GitFileIdentifier Hash);

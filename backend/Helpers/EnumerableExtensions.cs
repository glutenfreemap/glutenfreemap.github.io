namespace GlutenFreeMap.Backend.Helpers;

public static class EnumerableExtensions
{
    public static IEnumerable<T> Flatten<T>(this IEnumerable<T> sequence, Func<T, IEnumerable<T>> getChildren)
    {
        return sequence.Concat(sequence.SelectMany(s => Flatten(getChildren(s), getChildren)));
    }
}

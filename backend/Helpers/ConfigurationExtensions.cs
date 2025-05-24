using System.ComponentModel.DataAnnotations;

namespace GlutenFreeMap.Backend.Helpers;

public static class ConfigurationExtensions
{
    public static T GetAndValidate<T>(this IConfiguration configuration)
    {
        var value = configuration.Get<T>();
        if (value is null)
        {
            throw new ValidationException("Missing configuration section");
        }

        var ctx = new ValidationContext(value);
        Validator.ValidateObject(value, ctx, true);

        return value;
    }
}

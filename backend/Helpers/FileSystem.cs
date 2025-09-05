namespace GlutenFreeMap.Backend.Helpers;

public static class FileSystem
{
    public static void DeleteDirectory(string path)
    {
        DeleteDirectory(new DirectoryInfo(path));
    }

    private static void DeleteDirectory(DirectoryInfo directory)
    {
        foreach (var entry in directory.EnumerateFileSystemInfos())
        {
            switch (entry)
            {
                case DirectoryInfo subdirectory:
                    DeleteDirectory(subdirectory);
                    break;

                case FileInfo file:
                    if (file.Attributes != FileAttributes.Normal)
                    {
                        file.Attributes = FileAttributes.Normal;
                    }
                    file.Delete();
                    break;

                default:
                    entry.Delete();
                    break;
            }
        }

        directory.Delete();
    }
}

namespace GlutenFreeMap.Backend.Helpers;

public sealed class AtomicDirectory : IDisposable
{
    private const string OldSuffix = ".old";
    private const string NewSuffix = ".new";
    private const string LockFileNameSuffix = ".lock";

    public string Path => curPath;
    private readonly string curPath;
    private readonly string oldPath;
    private readonly string newPath;
    private readonly string lockFilePath;
    private readonly FileStream? lockFile;

    public AtomicDirectory(string path)
    {
        curPath = path;
        oldPath = path + OldSuffix;
        newPath = path + NewSuffix;
        lockFilePath = path + LockFileNameSuffix;

        lockFile = new FileStream(
            lockFilePath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            1,
            FileOptions.DeleteOnClose
        );

        // Everything that we do after acquiring the lock needs to release it
        // if there is any exception.
        try
        {
            if (Directory.Exists(oldPath))
            {
                if (Directory.Exists(path))
                {
                    DeleteDirectory(oldPath);
                }
                else
                {
                    Directory.Move(oldPath, curPath);
                }
            }
            else if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(curPath);
            }
        }
        catch
        {
            lockFile.Dispose();
            lockFile = null;
            throw;
        }
    }

    public void Update(UpdateDelegate update)
    {
        if (Directory.Exists(newPath))
        {
            DeleteDirectory(newPath);
        }

        try
        {
            Directory.CreateDirectory(newPath);
            CopyDirectory(curPath, newPath);

            update(newPath, curPath);

            // Atomic update
            Directory.Move(curPath, oldPath);
            Directory.Move(newPath, curPath);
            DeleteDirectory(oldPath);
        }
        finally
        {
            try
            {
                if (Directory.Exists(newPath))
                {
                    DeleteDirectory(newPath);
                }
            }
            catch { } // Best effort clean-up
        }
    }

    public async Task UpdateAsync(UpdateAsyncDelegate update, CancellationToken cancellationToken)
    {
        if (Directory.Exists(newPath))
        {
            DeleteDirectory(newPath);
        }

        try
        {
            Directory.CreateDirectory(newPath);
            CopyDirectory(curPath, newPath);

            await update(newPath, curPath, cancellationToken);

            // Atomic update
            Directory.Move(curPath, oldPath);
            Directory.Move(newPath, curPath);
            DeleteDirectory(oldPath);
        }
        finally
        {
            try
            {
                if (Directory.Exists(newPath))
                {
                    DeleteDirectory(newPath);
                }
            }
            catch { } // Best effort clean-up
        }
    }

    private static void CopyDirectory(string sourceDir, string destinationDir)
    {
        // Get information about the source directory
        var dir = new DirectoryInfo(sourceDir);

        // Cache directories before we start copying
        DirectoryInfo[] dirs = dir.GetDirectories();

        // Create the destination directory
        Directory.CreateDirectory(destinationDir);

        // Get the files in the source directory and copy to the destination directory
        foreach (FileInfo file in dir.GetFiles())
        {
            string targetFilePath = System.IO.Path.Combine(destinationDir, file.Name);
            file.CopyTo(targetFilePath);
        }

        foreach (DirectoryInfo subDir in dirs)
        {
            string newDestinationDir = System.IO.Path.Combine(destinationDir, subDir.Name);
            CopyDirectory(subDir.FullName, newDestinationDir);
        }
    }

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

    public delegate void UpdateDelegate(string tempPath, string originalPath);
    public delegate Task UpdateAsyncDelegate(string tempPath, string originalPath, CancellationToken cancellationToken);

    public void Dispose()
    {
        lockFile?.Dispose();
    }
}

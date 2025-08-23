namespace GlutenFreeMap.Backend.Helpers;

public sealed class AtomicDirectory : IDisposable
{
    private const string TransactionalSuffix = ".tmp";
    private const string LockFileNameSuffix = ".lock";

    public string Path { get; }
    private readonly string transactionalPath;
    private readonly string lockFilePath;
    private readonly FileStream? lockFile;

    public AtomicDirectory(string path)
    {
        this.Path = path;
        transactionalPath = path + TransactionalSuffix;
        lockFilePath = path + LockFileNameSuffix;

        if (!Directory.Exists(path))
        {
            if (Directory.Exists(transactionalPath))
            {
                try
                {
                    Directory.Move(transactionalPath, path);
                }
                catch (IOException)
                {
                    // Assume that some other process has already renamed the directory
                }
            }
            else
            {
                // Does not throw if the directory already exists
                Directory.CreateDirectory(path);
            }
        }

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
            if (Directory.Exists(transactionalPath))
            {
                // The transactional directory exists but the main directory also exists.
                // Clean-it-up as there's nothing else that we can do.
                DeleteDirectory(transactionalPath);
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
        var tempDir = Directory.CreateTempSubdirectory();
        try
        {
            CopyDirectory(Path, tempDir.FullName);

            update(tempDir.FullName, Path);

            // Atomic update
            Directory.Move(Path, transactionalPath);
            tempDir.MoveTo(Path);
        }
        catch
        {
            try
            {
                tempDir.Delete(recursive: true);
            }
            catch { } // Best effort clean-up

            throw;
        }

        DeleteDirectory(transactionalPath);
    }

    public async Task UpdateAsync(UpdateAsyncDelegate update, CancellationToken cancellationToken)
    {
        var tempDir = Directory.CreateTempSubdirectory();
        try
        {
            CopyDirectory(Path, tempDir.FullName);

            await update(tempDir.FullName, Path, cancellationToken);

            // Atomic update
            Directory.Move(Path, transactionalPath);
            tempDir.MoveTo(Path);
        }
        catch
        {
            try
            {
                tempDir.Delete(recursive: true);
            }
            catch { } // Best effort clean-up

            throw;
        }

        DeleteDirectory(transactionalPath);
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

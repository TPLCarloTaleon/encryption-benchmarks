import * as FileSystem from "expo-file-system";

/**
 * Service for interacting with the encrypted file system.
 *
 * - When donwloading, it automatically stores the files as encrypted at rest.
 * - When reading, it decrypts an encrypted temporarily using `getDecryptedFileById`.
 */
export class EncryptedFileSystem {
  documentDirectory: string;
  key: string;
  encrypter: IEncryptionUtil;

  constructor(initialProperties: {
    key: string;
    /** @defaultValue set to `FileSystem.documentDirectory` (automatically determined by expo). */
    documentDirectory?: string;
    encrypter: IEncryptionUtil;
  }) {
    this.documentDirectory = initialProperties.documentDirectory ?? FileSystem.documentDirectory!;
    this.key = initialProperties.key;
    this.encrypter = initialProperties.encrypter;
  }

  /**
   * Downloads sourceURL and encrypts it immediately.
   */
  async download(params: {
    /** The URL of the file to download. */
    sourceURL: string;
    /** Unique ID of the file. Will be saved in the filesystem as this. */
    fileId: string;
    /** Options for the download. */
    options?: {
      /** Add auth here if the download url needs auth. */
      headers?: { Authorization: string };
      /** Callback to monitor download progress here. */
      onProgress?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void;
      /** For debugging purposes: True to prevent deleting. @defaultValue false. */
      _debugDontDeleteRaw?: boolean;
      onDownloadStart?: () => void;
      onEncryptStart?: () => void;
    };
  }) {
    const { fileId, sourceURL, options } = params;

    const defaultOptions = {
      _debugDontDeleteRaw: false,
      ...options,
    } as NonNullable<typeof options>;

    // TODO: How to get file extension here? Not sure.
    // const fileExtension = sourceURL.substring(sourceURL.lastIndexOf('.'));

    const rawPath = `${this.documentDirectory}${fileId}-raw.pdf`; // TODO: Replace .pdf with dynamic variable.

    const encryptedPath = `${this.documentDirectory}${fileId}.pdf`; // TODO: Replace .pdf with dynamic variable.

    // 1. Download the raw file.
    params?.options?.onDownloadStart?.(); // Notify that we're in this stage.

    const downloadResumableInstance = FileSystem.createDownloadResumable(
      sourceURL,
      rawPath,
      { headers: defaultOptions.headers, cache: true },
      defaultOptions?.onProgress
    );

    let response: FileSystem.FileSystemDownloadResult | undefined;
    response = await downloadResumableInstance.downloadAsync();

    // Throw errors from failed download here.
    if (response?.status === 404) throw Error("404: Download URL does not exist. Can be the bucket not existing.");
    if (response?.status === 401) throw Error("401: Download URL requires auth. Add it in the options.");

    // 2. Encrypt it.
    params?.options?.onEncryptStart?.(); // Notify that we're in this stage.

    await this.encrypter.encrypt({
      filePath: rawPath,
      outputPath: encryptedPath,
      password: this.key,
    });

    // 3. Delete the raw file.
    if (!defaultOptions._debugDontDeleteRaw) await FileSystem.deleteAsync(rawPath);

    return {
      /** The encrypted file path. */
      encryptedPath: encryptedPath,
      /** For debugging only: The downloaded path. DOES not exist if debugDontDelete is on. */
      _rawPath: response?.uri,
    };
  }

  /**
   * Gets info about the file based on the `fileId`
   * Info: path, exists, or size.
   */
  async getFileInfoById(fileId: string) {
    const encryptedFileInfo = await FileSystem.getInfoAsync(`${this.documentDirectory}${fileId}.pdf`, {
      size: true,
    }); // TODO: Replace .pdf with dynamic variable.

    return {
      /** The path. It can point to a non-existing file if `exists === false`. */
      path: encryptedFileInfo.uri,
      /** True if the file path exists. */
      exists: encryptedFileInfo.exists,
      /** The size of the file in bytes. */
      size: (encryptedFileInfo as typeof encryptedFileInfo & { size?: number }).size ?? 0,
    };
  }

  /**
   * Gets a decrypted version of a file based on the `fileId`.
   *
   * The decrypted version is viewable in the file-system for a short period of time only.
   */
  async getDecryptedFileById(fileId: string) {
    // ----------- 1. Check if encrypted file exists. -----------
    const encryptedFileInfo = await FileSystem.getInfoAsync(`${this.documentDirectory}${fileId}.pdf`); // TODO: Replace .pdf with dynamic variable.

    // Encrypted File does not exist.
    if (!encryptedFileInfo.exists) {
      // Throw an error. Usually, you can ask to try and download it again.
      throw new Error("Please download the file first.");
    }

    // ----------- 2. Check if decrypted file exists. -----------
    let decryptedFileInfo = await FileSystem.getInfoAsync(`${this.documentDirectory}${fileId}-decrypted.pdf`); // TODO: Replace .pdf with dynamic variable.

    // Decrypted File does not exist. (Not decrypted recently).
    if (!decryptedFileInfo.exists) {
      const fileExtension = encryptedFileInfo.uri.substring(encryptedFileInfo.uri.lastIndexOf("."));
      const outputPath = `${this.documentDirectory}${fileId}-decrypted${fileExtension}`;

      await this.encrypter.decrypt({
        encryptedPath: encryptedFileInfo.uri,
        outputPath: outputPath,
        password: this.key,
      });
      /** @todo Handle decryption errors. */
    }

    // ----------- 3. Return successfully. -----------
    decryptedFileInfo = await FileSystem.getInfoAsync(`${this.documentDirectory}${fileId}-decrypted.pdf`); // TODO: Replace .pdf with dynamic variable.

    // At this point, it should exist.
    // Return the path to the decrypted file.
    return decryptedFileInfo.uri;
  }

  /**
   * Helper function to conveniently download and decrypt a file immediately.
   * Has the same parameters as `download`.
   *
   * Note: This wraps around `checkExistsByFileId`, `download`, and `getDecryptedFileById`
   * for convenience.
   *
   * The only disadvantage to using this function is not having control over each step
   * of the process (e.g. showing a toast message at each stage: 'Checking file', 'Downloading', or 'Decrypting').
   *
   * For that usecase, I recommend building your own using the primitive methods of this service.
   */
  async downloadIfNotExistsAndDecrypt(params: Parameters<typeof this.download>[0]) {
    const { fileId } = params;

    const { exists, path } = await this.getFileInfoById(fileId);

    let encryptedPath: string = path;
    let rawPath = null;

    // ----------- 1. Download and Encrypt. -----------
    if (!exists) {
      const { encryptedPath: _encryptedPath, _rawPath } = await this.download(params);

      encryptedPath = _encryptedPath;
      rawPath = _rawPath;
      // console.log('Downloaded (raw) path:', _rawPath); // DEBUGGING
    }

    // ----------- 2. Decrypt and Show. -----------
    const decryptedPath = await this.getDecryptedFileById(fileId);

    // console.log('Encrypted path:', encryptedPath); //  DEBUGGING
    // console.log('Decrypted path:', decryptedPath); //  DEBUGGING

    return {
      /** The encrypted file path. */
      encryptedPath,
      /** The decrypted file path. */
      decryptedPath,
      /** For debugging only: The downloaded path. DOES not exist if _debugDontDelete is true. */
      _rawPath: rawPath,
    };
  }

  /**
   * Removes all decrypted files.
   * This is useful to do if the user leaves the app, or loses focus of the app.
   * So that they can't just go into the file manager and replicate the data.
   */
  async clearDecrypted() {
    // Get a list of all files in the document directory
    const directoryContents = await FileSystem.readDirectoryAsync(this.documentDirectory);

    // Filter the list to only include decrypted files
    const decryptedFiles = directoryContents.filter((fileName) => fileName.endsWith("-decrypted.pdf")); // TODO: Replace .pdf with dynamic variable.

    // Delete each decrypted file
    for (const fileName of decryptedFiles) {
      const filePath = `${this.documentDirectory}${fileName}`;
      await FileSystem.deleteAsync(filePath);
    }

    return {
      success: true,
      deletedFiles: decryptedFiles,
    };
  }
}

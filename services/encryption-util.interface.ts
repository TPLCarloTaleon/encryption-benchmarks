interface IEncryptionUtil {
  encrypt: (params: {
    /** Existing unencrypted file path. Usually the file that was just downloaded. */
    filePath: string;
    /** Encrypted file path output. */
    outputPath: string;
    /** The password to encrypt the file with. */
    password: string;
  }) => Promise<void>;

  //

  decrypt: (params: {
    /** Existing encrypted file path. */
    encryptedPath: string;
    /** Decrypted file path output. */
    outputPath: string;
    /** Must be the same password as it was encrypted with. */
    password: string;
  }) => Promise<void>;
}

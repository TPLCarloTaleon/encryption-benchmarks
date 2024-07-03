/**
 * This is a wrapper library around:
 * - expo-file-system
 * - crypto-es
 *
 * That gives utilities for easily decrypting and encrypting files.
 */

import Aes from "react-native-aes-crypto";
import * as FileSystem from "expo-file-system";

/**
 * Encrypts an existing file (`filePath`) in the filesystem using a `password`.
 *
 * Saves the encrypted file into `outputPath`.
 */
export async function encrypt(params: {
  /** Existing unencrypted file path. Usually the file that was just downloaded. */
  filePath: string;
  /** Encrypted file path output. */
  outputPath: string;
  /** The password to encrypt the file with. */
  password: string;
}): Promise<void> {
  const { filePath, outputPath, password } = params;

  const startTime = Date.now();
  try {
    const fileContentBase64 = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // const encrypted = CryptoES.AES.encrypt(fileContentBase64, password);

    // const encrypted = await Aes.randomKey(16).then(iv => {
    //     return Aes.encrypt(fileContentBase64, password, iv, 'aes-256-cbc').then(cipher => ({
    //         cipher,
    //         iv,
    //     }))
    // })

    /** For this, we choose not to have a unique iv. */
    const encrypted = await Aes.encrypt(fileContentBase64, password, "123456", "aes-256-cbc");

    // ✅ DONE Encrypting.
    await FileSystem.writeAsStringAsync(outputPath, encrypted.toString(), { encoding: FileSystem.EncodingType.Base64 });
  } catch (error) {
    console.error("Encryption failed:", error);
  } finally {
    const endTime = Date.now();
    const timePassed = endTime - startTime;
    // console.log(`Time passed in encrypt function: ${timePassed} milliseconds`); // Uncomment to debug.
  }
}

/**
 * Decrypts an existing encrypted file (`encryptedPath`) using a `password`.
 *
 * Saves the decrypted file into `outputPath`. If the password is wrong,
 * it won't throw an error, it will still output a file but will be unreadable.
 */
export async function decrypt(params: {
  /** Existing encrypted file path. */
  encryptedPath: string;
  /** Decrypted file path output. */
  outputPath: string;
  /** Must be the same password as it was encrypted with. */
  password: string;
}): Promise<void> {
  const { encryptedPath, outputPath, password } = params;

  const startTime = Date.now();
  try {
    const fileContentB64 = await FileSystem.readAsStringAsync(encryptedPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // const decryptedBytes = CryptoES.AES.decrypt(fileContentB64, password).toString(CryptoES.enc.Utf8);
    const decryptedBytes = await Aes.decrypt(fileContentB64, password, "123456", "aes-256-cbc");

    // ✅  DONE Decrypting.
    await FileSystem.writeAsStringAsync(outputPath, decryptedBytes, { encoding: FileSystem.EncodingType.Base64 });
  } catch (error) {
    console.error("Decryption failed:", error);
  } finally {
    const endTime = Date.now();
    const timePassed = endTime - startTime;
    // console.log(`Time passed in decrypt function: ${timePassed} milliseconds`); // Uncomment to debug.
  }
}

export default { encrypt, decrypt };

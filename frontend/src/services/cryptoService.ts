import { storeCryptoKey, getCryptoKey, deleteCryptoKey } from '../utils/db';

/**
 * Converts a PEM-formatted private key string into a CryptoKey object.
 * @param pem The PEM string of the private key.
 * @returns A CryptoKey object.
 */
async function importRsaPrivateKey(pem: string): Promise<CryptoKey> {
  // 1. Remove PEM headers/footers and whitespace. Handles both PKCS#1 and PKCS#8 headers.
  const pemContents = pem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  // 2. Base64 decode the string to get an ArrayBuffer
  const binaryDer = window.atob(pemContents);
  const binaryDerBuffer = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    binaryDerBuffer[i] = binaryDer.charCodeAt(i);
  }

  // 3. Import the key into the Web Crypto API
  return window.crypto.subtle.importKey(
    'pkcs8', // Private key format produced by forge.wrapRsaPrivateKey
    binaryDerBuffer.buffer,
    {
      name: 'RSA-OAEP', // Match backend encryption algorithm
      hash: 'SHA-256',
    },
    false, // Make the key non-extractable for security
    ['decrypt'] // Specify key usages
  );
}

/**
 * Imports a PEM private key, converts it to a non-extractable CryptoKey,
 * and stores it in IndexedDB.
 *
 * @param userId The ID of the user.
 * @param privateKeyPem The PEM-formatted private key string.
 */
export async function importAndStorePrivateKey(userId: string, privateKeyPem: string): Promise<void> {
  if (!userId || !privateKeyPem) {
    throw new Error('User ID and private key are required.');
  }
  try {
    const cryptoKey = await importRsaPrivateKey(privateKeyPem);
    await storeCryptoKey(userId, cryptoKey);
  } catch (error) {
    console.error('Error importing or storing private key:', error);
    throw new Error('Could not process and store private key.');
  }
}

/**
 * Decrypts data using the stored private key for a given user.
 *
 * @param userId The ID of the user.
 * @param encryptedData The data to decrypt (as a Base64 string).
 * @returns The decrypted data as a string.
 */
export async function decryptWithStoredKey(userId: string, encryptedData: string): Promise<string> {
  if (!userId || !encryptedData) {
    throw new Error('User ID and encrypted data are required.');
  }

  try {
    const cryptoKey = await getCryptoKey(userId);
    if (!cryptoKey) {
      throw new Error('Private key not found for this user. Please log in again.');
    }

    const dataBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      cryptoKey,
      dataBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Could not decrypt data.');
  }
}

/**
 * Deletes the stored private key for a user from IndexedDB.
 *
 * @param userId The ID of the user.
 */
export async function deletePrivateKey(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await deleteCryptoKey(userId);
  } catch (error) {
    console.error('Error deleting private key:', error);
  }
}

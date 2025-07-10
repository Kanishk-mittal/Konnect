import forge from 'node-forge';

/**
 * Encrypts a string message using RSA public key
 * @param message String message to encrypt
 * @param publicKey RSA public key in PEM format
 * @returns Encrypted message as base64 string
 */
export const encryptRSA = (message: string, publicKey: string): string => {
    const publicKeyForge = forge.pki.publicKeyFromPem(publicKey);
    const encrypted = publicKeyForge.encrypt(message, 'RSA-OAEP');
    return forge.util.encode64(encrypted);
};

/**
 * Decrypts a base64 encrypted message using RSA private key
 * @param encryptedMessage Base64 encrypted message
 * @param privateKey RSA private key in PEM format
 * @returns Decrypted message as string
 */
export const decryptRSA = (encryptedMessage: string, privateKey: string): string => {
    const privateKeyForge = forge.pki.privateKeyFromPem(privateKey);
    const encrypted = forge.util.decode64(encryptedMessage);
    const decrypted = privateKeyForge.decrypt(encrypted, 'RSA-OAEP');
    return decrypted;
};

/**
 * Generates a random RSA key pair
 * @returns Tuple of [privateKey, publicKey] both in PEM format
 */
export const generateRSAKeyPair = (): [string, string] => {
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const privateKey = forge.pki.privateKeyToPem(keypair.privateKey);
    const publicKey = forge.pki.publicKeyToPem(keypair.publicKey);
    return [privateKey, publicKey];
};

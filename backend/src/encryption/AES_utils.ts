import forge from 'node-forge';

/**
 * Encrypts a string message using AES-256-GCM
 * @param message String message to encrypt
 * @param key AES key as base64 string (32 bytes for AES-256)
 * @returns Object containing encrypted message, IV, and auth tag all as base64 strings
 */
export const encryptAES = (message: string, key: string): { encrypted: string; iv: string; tag: string } => {
    const keyBytes = forge.util.decode64(key);
    const iv = forge.random.getBytesSync(12); // 12 bytes for GCM
    const cipher = forge.cipher.createCipher('AES-GCM', keyBytes);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(message));
    cipher.finish();
    
    return {
        encrypted: forge.util.encode64(cipher.output.getBytes()),
        iv: forge.util.encode64(iv),
        tag: forge.util.encode64(cipher.mode.tag.getBytes())
    };
};

/**
 * Decrypts an AES-256-GCM encrypted message
 * @param encryptedData Object containing encrypted message, IV, and auth tag
 * @param key AES key as base64 string (32 bytes for AES-256)
 * @returns Decrypted message as string
 */
export const decryptAES = (encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string => {
    const keyBytes = forge.util.decode64(key);
    const iv = forge.util.decode64(encryptedData.iv);
    const encrypted = forge.util.decode64(encryptedData.encrypted);
    const tag = forge.util.decode64(encryptedData.tag);
    
    const decipher = forge.cipher.createDecipher('AES-GCM', keyBytes);
    decipher.start({ iv: iv, tag: forge.util.createBuffer(tag) });
    decipher.update(forge.util.createBuffer(encrypted));
    const success = decipher.finish();
    
    if (!success) {
        throw new Error('Authentication failed - message may have been tampered with');
    }
    
    return decipher.output.toString();
};

/**
 * Generates a random AES-256 key
 * @returns AES key as base64 string (32 bytes)
 */
export const generateAESKey = (): string => {
    const key = forge.random.getBytesSync(32); // 32 bytes for AES-256
    return forge.util.encode64(key);
};
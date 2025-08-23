import forge from 'node-forge';

/**
 * Encrypts a string message using AES-256-GCM
 * @param message String message to encrypt
 * @param key AES key as base64 string (32 bytes for AES-256)
 * @returns Combined string containing IV, tag, and encrypted message separated by colons
 */
export const encryptAES = (message: string, key: string): string => {
    const keyBytes = forge.util.decode64(key);
    const iv = forge.random.getBytesSync(12); // 12 bytes for GCM
    const cipher = forge.cipher.createCipher('AES-GCM', keyBytes);
    cipher.start({ iv: iv });
    cipher.update(forge.util.createBuffer(message));
    cipher.finish();
    
    const encrypted = forge.util.encode64(cipher.output.getBytes());
    const ivBase64 = forge.util.encode64(iv);
    const tag = forge.util.encode64(cipher.mode.tag.getBytes());
    
    // Combine IV, tag, and encrypted data with colon separator
    return `${ivBase64}:${tag}:${encrypted}`;
};

/**
 * Decrypts an AES-256-GCM encrypted message
 * @param encryptedString Combined string containing IV, tag, and encrypted message separated by colons
 * @param key AES key as base64 string (32 bytes for AES-256)
 * @returns Decrypted message as string
 */
export const decryptAES = (encryptedString: string, key: string): string => {
    // Split the combined string to extract IV, tag, and encrypted data
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format. Expected format: iv:tag:encrypted');
    }
    
    const ivBase64 = parts[0];
    const tagBase64 = parts[1];
    const encryptedBase64 = parts[2];
    
    if (!ivBase64 || !tagBase64 || !encryptedBase64) {
        throw new Error('Invalid encrypted data format. Missing required components.');
    }
    
    const keyBytes = forge.util.decode64(key);
    const iv = forge.util.decode64(ivBase64);
    const encrypted = forge.util.decode64(encryptedBase64);
    const tag = forge.util.decode64(tagBase64);
    
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

/**
 * Generates a deterministic AES-256 key from a string input
 * The same string will always produce the same key, different strings produce different keys
 * @param input String input of any length
 * @returns AES key as base64 string (32 bytes)
 */
export const generateAESKeyFromString = (input: string): string => {
    // Create SHA-256 hash of the input string
    const md = forge.md.sha256.create();
    md.update(input, 'utf8');
    const hash = md.digest();
    
    // The SHA-256 hash is exactly 32 bytes, perfect for AES-256
    return forge.util.encode64(hash.getBytes());
};

/**
 * Encrypts all values in an object using AES-256-GCM
 * @param obj Object with string values to encrypt
 * @param key AES key as base64 string (32 bytes for AES-256)
 * @returns Object with same keys but encrypted values
 */
export const encryptObject = (obj: Record<string, string>, key: string): Record<string, string> => {
    const encryptedObj: Record<string, string> = {};
    
    for (const [objKey, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            encryptedObj[objKey] = encryptAES(value, key);
        } else {
            // Keep non-string values as-is (or convert to string first)
            encryptedObj[objKey] = encryptAES(String(value), key);
        }
    }
    
    return encryptedObj;
};

/**
 * Decrypts all values in an object using AES-256-GCM
 * @param encryptedObj Object with encrypted string values
 * @param key AES key as base64 string (32 bytes for AES-256)
 * @returns Object with same keys but decrypted values
 */
export const decryptObject = (encryptedObj: Record<string, string>, key: string): Record<string, string> => {
    const decryptedObj: Record<string, string> = {};
    
    for (const [objKey, encryptedValue] of Object.entries(encryptedObj)) {
        try {
            decryptedObj[objKey] = decryptAES(encryptedValue, key);
        } catch (error) {
            throw new Error(`Decryption failed for key "${objKey}". ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    return decryptedObj;
};

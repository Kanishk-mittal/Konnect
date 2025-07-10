import forge from 'node-forge';

/**
 * Creates a hashed version of the input string using SHA-256.
 * Note: This is a browser-compatible alternative to bcrypt
 * @param {string} input - The string to hash.
 * @returns {Promise<string>} - The hashed string.
 */
export async function createHash(input: string): Promise<string> {
    // Create a salt for added security
    const salt = forge.random.getBytesSync(16);
    const saltedInput = salt + input;
    
    // Create SHA-256 hash
    const md = forge.md.sha256.create();
    md.update(saltedInput, 'utf8');
    const hash = md.digest();
    
    // Combine salt and hash, encode as base64
    const combined = salt + hash.getBytes();
    return forge.util.encode64(combined);
}

/**
 * Verifies if the input string matches the hashed string.
 * Note: This is a browser-compatible alternative to bcrypt
 * @param {string} input - The string to verify.
 * @param {string} hash - The hashed string to compare against.
 * @returns {Promise<boolean>} - True if the input matches the hash, false otherwise.
 */
export async function verifyHash(input: string, hash: string): Promise<boolean> {
    try {
        // Decode the combined salt+hash
        const combined = forge.util.decode64(hash);
        
        // Extract salt (first 16 bytes) and original hash (remaining bytes)
        const salt = combined.substring(0, 16);
        const originalHash = combined.substring(16);
        
        // Hash the input with the extracted salt
        const saltedInput = salt + input;
        const md = forge.md.sha256.create();
        md.update(saltedInput, 'utf8');
        const newHash = md.digest();
        
        // Compare the hashes
        return originalHash === newHash.getBytes();
    } catch (error) {
        console.error('Error verifying hash:', error);
        return false;
    }
}

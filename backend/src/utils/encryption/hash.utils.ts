import bcrypt from 'bcrypt';

/**
 * Creates a hashed version of the input string using bcrypt.
 * @param {string} input - The string to hash.
 * @returns {Promise<string>} - The hashed string.
 */
export async function createHash(input: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(input, saltRounds);
}

/**
 * Verifies if the input string matches the hashed string.
 * @param {string} input - The string to verify.
 * @param {string} hash - The hashed string to compare against.
 * @returns {Promise<boolean>} - True if the input matches the hash, false otherwise.
 */
export async function verifyHash(input: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(input, hash);
}

/**
 * Generates a random password for users
 * @param {number} length - Length of the password (default: 12)
 * @returns {string} - Random password string
 */
export function generateRandomPassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}
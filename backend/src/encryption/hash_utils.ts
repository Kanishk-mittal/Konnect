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
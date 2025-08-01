import { encryptAES, decryptAES } from '../encryption/AES_utils';
import { decryptRSA, generateRSAKeyPair } from '../encryption/RSA_utils';
import { postData } from '../api/requests';

/**
 * Gets the external AES key from the backend
 */
const getExternalAESKey = async (): Promise<string> => {
    try {
        // Generate our own key pair for this session
        const [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();

        // Request the encrypted AES key from the server
        const response = await postData('/encryption/aes/external-key', {
            publicKey: clientPublicKey
        });

        if (!response.status) {
            throw new Error('Failed to get external AES key');
        }

        // Decrypt the AES key using our private key
        return decryptRSA(response.aesKey, clientPrivateKey);
    } catch (error) {
        console.error('Error getting external AES key:', error);
        throw error;
    }
};

/**
 * Generates the localStorage key name for a user's private key
 */
const generateStorageKey = (userType: string, userId: string): string => {
    return `PrivateKey_${userType}_${userId}`;
};

/**
 * Saves a private key to localStorage (encrypted)
 */
export const savePrivateKey = async (
    privateKey: string,
    userType: string,
    userId: string
): Promise<void> => {
    try {
        const externalAESKey = await getExternalAESKey();
        const encryptedPrivateKey = encryptAES(privateKey, externalAESKey);
        const storageKey = generateStorageKey(userType, userId);
        
        localStorage.setItem(storageKey, encryptedPrivateKey);
    } catch (error) {
        console.error('Error saving private key:', error);
        throw error;
    }
};

/**
 * Retrieves a private key from localStorage (decrypted)
 */
export const getPrivateKey = async (
    userType: string,
    userId: string
): Promise<string | null> => {
    try {
        const storageKey = generateStorageKey(userType, userId);
        const encryptedPrivateKey = localStorage.getItem(storageKey);
        
        if (!encryptedPrivateKey) {
            return null;
        }

        const externalAESKey = await getExternalAESKey();
        return decryptAES(encryptedPrivateKey, externalAESKey);
    } catch (error) {
        console.error('Error retrieving private key:', error);
        return null;
    }
};

/**
 * Removes a private key from localStorage
 */
export const removePrivateKey = (userType: string, userId: string): void => {
    const storageKey = generateStorageKey(userType, userId);
    localStorage.removeItem(storageKey);
};

/**
 * Clears all private keys from localStorage
 */
export const clearAllPrivateKeys = (): void => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('PrivateKey_')) {
            localStorage.removeItem(key);
        }
    });
};

import axios from 'axios';
import { encryptAES, decryptAES, generateAESKey } from '../encryption/AES_utils';
import { encryptRSA, decryptRSA, generateRSAKeyPair } from '../encryption/RSA_utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const instance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

/**
 * Gets the server's public key from the server
 */
const getServerPublicKey = async (): Promise<{ publicKey: string; keyId: string }> => {
    try {
        const response = await getData('/encryption/rsa/publicKey', {});

        if (!response || !response.status || !response.publicKey || !response.keyId) {
            throw new Error('Invalid server public key response');
        }

        return {
            publicKey: response.publicKey,
            keyId: response.keyId
        };
    } catch (error) {
        console.error('Failed to get server public key:', error);
        throw new Error('Unable to establish secure connection with server');
    }
};

/**
 * Decrypts a server response using client's private key.
 * 
 * The backend's encryptResponse middleware encrypts the entire response JSON
 * into a single AES-encrypted `data` field, with the AES key RSA-encrypted in `key`.
 * This function reverses that process and returns the original parsed response object.
 */
const decryptServerResponse = (encryptedResponse: any, clientPrivateKey: string): any => {
    try {
        // Check if response is encrypted (has 'key' field)
        if (!encryptedResponse.key) {
            // Response is not encrypted, return as-is
            return encryptedResponse;
        }

        // Decrypt the AES key using client's private key
        const aesKey = decryptRSA(encryptedResponse.key, clientPrivateKey);

        // The server encrypts the entire response JSON into the 'data' field.
        // Decrypt it and parse back to an object.
        if (encryptedResponse.data && typeof encryptedResponse.data === 'string') {
            const decryptedString = decryptAES(encryptedResponse.data, aesKey);
            try {
                return JSON.parse(decryptedString);
            } catch {
                // If JSON parsing fails, return the raw string wrapped in an object
                return { data: decryptedString };
            }
        }

        // Fallback: decrypt individual fields (for non-standard encrypted responses)
        const decryptedResponse: any = {};

        for (const [key, value] of Object.entries(encryptedResponse)) {
            if (key === 'key' || key === 'keyId') {
                // Skip encryption metadata
                continue;
            }

            if (typeof value === 'string' && value.includes(':')) {
                // This looks like encrypted data, try to decrypt it
                try {
                    const decrypted = decryptAES(value, aesKey);
                    try {
                        decryptedResponse[key] = JSON.parse(decrypted);
                    } catch {
                        decryptedResponse[key] = decrypted;
                    }
                } catch {
                    // If decryption fails, keep original value
                    decryptedResponse[key] = value;
                }
            } else {
                // Not encrypted, keep as-is
                decryptedResponse[key] = value;
            }
        }

        return decryptedResponse;
    } catch (error) {
        console.error('Failed to decrypt server response:', error);
        throw new Error('Failed to decrypt server response');
    }
};

export const postData = async (endpoint: string, data: any) => {
    try {
        const response = await instance.post(endpoint, data);
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const getData = async (endpoint: string, params?: any) => {
    try {
        const response = await instance.get(endpoint, { params });
        return response.data;
    } catch (error) {
        throw error;
    }
}

export const deleteData = async (endpoint: string, data: any) => {
    try {
        const response = await instance.delete(endpoint, { data });
        return response.data;
    } catch (error) {
        throw error;
    }
}

/**
 * Logs out the current user by clearing the auth token cookie
 * Can be used for admin, club, or student logout
 * @param userType - 'admin', 'club', or 'student'
 */
export const logout = async (userType: 'admin' | 'club' | 'student' = 'admin') => {
    try {
        const endpoint = `/${userType}/logout`;
        const response = await instance.post(endpoint);
        return response.data;
    } catch (error) {
        // Even if logout fails on server, we consider it successful
        // The cookie will expire eventually
        console.warn('Logout request failed, but continuing:', error);
        return { status: true, message: 'Logged out locally' };
    }
}

/**
 * Sends encrypted POST request and handles encrypted response
 * @param endpoint API endpoint to call
 * @param data Data object to encrypt and send
 * @param options Optional configuration
 * @returns Decrypted response data
 */
export const postEncryptedData = async (
    endpoint: string,
    data: any,
    options: {
        expectEncryptedResponse?: boolean;
        clientKeys?: { privateKey: string; publicKey: string };
    } = {}
) => {
    try {
        const { expectEncryptedResponse = false, clientKeys } = options;

        // 1. Get server's public key
        const { publicKey: serverPublicKey, keyId } = await getServerPublicKey();

        // 2. Generate client RSA key pair if needed for encrypted response
        let clientPrivateKey = '';
        let clientPublicKey = '';

        if (expectEncryptedResponse) {
            if (clientKeys) {
                clientPrivateKey = clientKeys.privateKey;
                clientPublicKey = clientKeys.publicKey;
            } else {
                [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();
            }
        }

        // 3. Generate AES key and encrypt the data
        const aesKey = generateAESKey();
        const dataJson = JSON.stringify(data);
        const encryptedData = encryptAES(dataJson, aesKey);

        // 4. Encrypt the AES key with server's public key
        const encryptedAesKey = encryptRSA(aesKey, serverPublicKey);

        // 5. Prepare the encrypted payload
        const encryptedPayload = {
            key: encryptedAesKey,
            keyId: keyId,
            data: encryptedData,
            ...(expectEncryptedResponse && { publicKey: clientPublicKey })
        };

        // 6. Send the encrypted request
        const response = await postData(endpoint, encryptedPayload);

        // 7. Decrypt response if needed
        if (expectEncryptedResponse && clientPrivateKey) {
            return decryptServerResponse(response, clientPrivateKey);
        }

        return response;

    } catch (error) {
        console.error('Encrypted POST request failed:', error);
        throw error;
    }
};

/**
 * Sends encrypted PUT request with automatic encryption/decryption
 * @param endpoint API endpoint to call
 * @param data Data to send (will be automatically encrypted)
 * @param options Optional configuration for response encryption
 * @returns Response data (decrypted if encrypted)
 */
export const putEncryptedData = async (
    endpoint: string,
    data: any,
    options: {
        expectEncryptedResponse?: boolean;
        clientKeys?: { privateKey: string; publicKey: string };
    } = {}
) => {
    try {
        const { expectEncryptedResponse = false, clientKeys } = options;

        // 1. Get server's public key
        const { publicKey: serverPublicKey, keyId } = await getServerPublicKey();

        // 2. Generate client RSA key pair if needed for encrypted response
        let clientPrivateKey = '';
        let clientPublicKey = '';

        if (expectEncryptedResponse) {
            if (clientKeys) {
                clientPrivateKey = clientKeys.privateKey;
                clientPublicKey = clientKeys.publicKey;
            } else {
                [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();
            }
        }

        // 3. Generate AES key and encrypt the data
        const aesKey = generateAESKey();
        const dataJson = JSON.stringify(data);
        const encryptedData = encryptAES(dataJson, aesKey);

        // 4. Encrypt the AES key with server's public key
        const encryptedAesKey = encryptRSA(aesKey, serverPublicKey);

        // 5. Prepare the encrypted payload
        const encryptedPayload = {
            key: encryptedAesKey,
            keyId: keyId,
            data: encryptedData,
            ...(expectEncryptedResponse && { publicKey: clientPublicKey })
        };

        // 6. Send the encrypted request via PUT
        const response = await instance.put(endpoint, encryptedPayload);

        // 7. Decrypt response if needed
        if (expectEncryptedResponse && clientPrivateKey) {
            return decryptServerResponse(response.data, clientPrivateKey);
        }

        return response.data;

    } catch (error) {
        console.error('Encrypted PUT request failed:', error);
        throw error;
    }
};

/**
 * Sends encrypted GET request and handles encrypted response
 * Note: GET requests typically don't send encrypted data, but can receive encrypted responses
 * @param endpoint API endpoint to call
 * @param params Query parameters
 * @param options Optional configuration
 * @returns Decrypted response data
 */
export const getEncryptedData = async (
    endpoint: string,
    params: any = {},
    options: {
        expectEncryptedResponse?: boolean;
        clientKeys?: { privateKey: string; publicKey: string };
    } = {}
) => {
    try {
        const { expectEncryptedResponse = false, clientKeys } = options;

        // Generate client RSA key pair if expecting encrypted response
        let clientPrivateKey = '';

        if (expectEncryptedResponse) {
            if (clientKeys) {
                clientPrivateKey = clientKeys.privateKey;
            } else {
                [clientPrivateKey] = generateRSAKeyPair();
            }
        }

        // Send the GET request
        const response = await getData(endpoint, params);

        // Decrypt response if needed
        if (expectEncryptedResponse && clientPrivateKey) {
            return decryptServerResponse(response, clientPrivateKey);
        }

        return response;

    } catch (error) {
        console.error('Encrypted GET request failed:', error);
        throw error;
    }
};

// The deleteData function is already defined above

/**
 * Sends encrypted DELETE request
 * @param endpoint API endpoint to call
 * @param data Data object to encrypt and send
 * @param options Optional configuration
 * @returns Decrypted response data
 */
export const deleteEncryptedData = async (
    endpoint: string,
    data: any,
    options: {
        expectEncryptedResponse?: boolean;
        clientKeys?: { privateKey: string; publicKey: string };
    } = {}
) => {
    try {
        const { expectEncryptedResponse = false, clientKeys } = options;

        // 1. Get server's public key
        const { publicKey: serverPublicKey, keyId } = await getServerPublicKey();

        // 2. Generate client RSA key pair if needed for encrypted response
        let clientPrivateKey = '';
        let clientPublicKey = '';

        if (expectEncryptedResponse) {
            if (clientKeys) {
                clientPrivateKey = clientKeys.privateKey;
                clientPublicKey = clientKeys.publicKey;
            } else {
                [clientPrivateKey, clientPublicKey] = generateRSAKeyPair();
            }
        }

        // 3. Generate AES key and encrypt the data
        const aesKey = generateAESKey();
        const dataJson = JSON.stringify(data);
        const encryptedData = encryptAES(dataJson, aesKey);

        // 4. Encrypt the AES key with server's public key
        const encryptedAesKey = encryptRSA(aesKey, serverPublicKey);

        // 5. Prepare the encrypted payload
        const encryptedPayload = {
            key: encryptedAesKey,
            keyId: keyId,
            data: encryptedData,
            ...(expectEncryptedResponse && { publicKey: clientPublicKey })
        };

        // 6. Send the encrypted DELETE request
        const response = await deleteData(endpoint, encryptedPayload);

        // 7. Decrypt response if needed
        if (expectEncryptedResponse && clientPrivateKey) {
            return decryptServerResponse(response, clientPrivateKey);
        }

        return response;
    } catch (error) {
        console.error('Encrypted DELETE request failed:', error);
        throw error;
    }
};


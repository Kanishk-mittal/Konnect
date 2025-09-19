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
 * Decrypts a server response using client's private key
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

        // Decrypt each field in the response (except 'key' and 'keyId')
        const decryptedResponse: any = {};

        for (const [key, value] of Object.entries(encryptedResponse)) {
            if (key === 'key' || key === 'keyId') {
                // Skip encryption metadata
                continue;
            }

            if (typeof value === 'string' && value.includes(':')) {
                // This looks like encrypted data, try to decrypt it
                try {
                    decryptedResponse[key] = decryptAES(value, aesKey);
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
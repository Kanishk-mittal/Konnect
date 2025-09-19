import { Request, Response, NextFunction } from 'express';
import { KeyManager } from '../utils/encryption/key-manager.utils';
import { decryptRSA } from '../utils/encryption/rsa.utils';
import { decryptAES } from '../utils/encryption/aes.utils';

/**
 * Interface for encrypted payload structure expected from frontend
 */
interface EncryptedPayload {
    key: string;      // AES key encrypted with server's RSA public key
    keyId: string;    // ID of the RSA key used for encryption
    data: string;     // JSON payload encrypted with AES key
    publicKey?: string; // Optional client public key for response encryption
}

/**
 * Middleware to automatically decrypt incoming encrypted requests
 * 
 * This is a PLUGIN middleware that can be easily added/removed from routes.
 * It detects encrypted payloads and automatically decrypts them, replacing
 * req.body with the decrypted data.
 * 
 * Usage:
 * ```typescript
 * router.post('/endpoint', decryptRequest, controller);
 * ```
 * 
 * To disable encryption, simply remove this middleware:
 * ```typescript
 * router.post('/endpoint', controller); // No encryption
 * ```
 */
export const decryptRequest = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const body = req.body;

        // Check if this is an encrypted payload
        // If not, skip decryption and proceed normally
        if (!body || typeof body !== 'object' || !body.key || !body.keyId || !body.data) {
            return next();
        }

        const encryptedPayload: EncryptedPayload = body;

        // 1. Get server's private key using the provided key ID
        const serverPrivateKey = KeyManager.getPrivateKey(encryptedPayload.keyId);
        if (!serverPrivateKey) {
            res.status(400).json({
                status: false,
                message: 'Invalid key identifier. Key may have expired.'
            });
            return;
        }

        // 2. Decrypt the AES key using RSA
        const aesKey = decryptRSA(encryptedPayload.key, serverPrivateKey);

        // 3. Decrypt the main data payload using the AES key
        const decryptedDataJson = decryptAES(encryptedPayload.data, aesKey);

        // 4. Parse the decrypted JSON and replace req.body
        const decryptedData = JSON.parse(decryptedDataJson);
        req.body = decryptedData;

        // 5. Store client's public key if provided (for response encryption)
        if (encryptedPayload.publicKey) {
            (req as any).clientPublicKey = encryptedPayload.publicKey;
        }

        console.log('✅ Request decryption successful');
        next();

    } catch (error) {
        console.error('❌ Request decryption failed:', error);

        // Return a generic error to avoid leaking encryption details
        res.status(400).json({
            status: false,
            message: 'Failed to decrypt request data. Please check your request format.',
            error: process.env.NODE_ENV === 'development' ?
                (error instanceof Error ? error.message : 'Unknown error') :
                undefined
        });
    }
};

/**
 * Helper function to check if a request body is encrypted
 * Useful for conditional logic in controllers
 * 
 * @param body Request body to check
 * @returns boolean indicating if body contains encrypted payload
 */
export const isEncryptedPayload = (body: any): body is EncryptedPayload => {
    return body &&
        typeof body === 'object' &&
        typeof body.key === 'string' &&
        typeof body.keyId === 'string' &&
        typeof body.data === 'string';
};
import { Request, Response, NextFunction } from 'express';
import { generateAESKey, encryptAES, decryptAES } from '../utils/encryption/aes.utils';
import { encryptRSA } from '../utils/encryption/rsa.utils';
import { internalAesKey } from '../constants/keys';
import StudentModel from '../models/Student.model';
import AdminModel from '../models/admin.model';
import ClubModel from '../models/club.model';

/**
 * Extended Request interface to include user information from auth middleware
 */
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        type: string;
        userType?: 'student' | 'admin' | 'club';
        iat?: number;
        exp?: number;
    };
    clientPublicKey?: string; // Set by decryptRequest middleware
}

/**
 * Middleware to resolve the public key to use for response encryption
 * 
 * This is the FIRST stage of response encryption. It determines which public key
 * to use based on the authentication status and stores it in res.locals.publicKey
 * 
 * Two scenarios:
 * 1. Unauthenticated user (login/registration): Use public key from request
 * 2. Authenticated user: Use stored public key from database
 * 
 * Usage:
 * ```typescript
 * router.post('/endpoint', decryptRequest, controller, resolvePublicKey, encryptResponse);
 * ```
 */
export const resolvePublicKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        let publicKey: string | null = null;

        // Scenario 1: Check if client sent a public key (unauthenticated scenario)
        if (req.clientPublicKey) {
            publicKey = req.clientPublicKey;
            console.log('✅ Using client-provided public key for response encryption');
        }
        // Scenario 2: Use authenticated user's stored public key
        else if (req.user?.id && (req.user?.userType || req.user?.type)) {
            const userId = req.user.id;
            const userType = req.user.userType || req.user.type;

            // Query the appropriate model based on user type
            let user: any = null;
            switch (userType) {
                case 'student':
                    user = await StudentModel.findById(userId).select('public_key');
                    break;
                case 'admin':
                    user = await AdminModel.findById(userId).select('public_key');
                    break;
                case 'club':
                    user = await ClubModel.findById(userId).select('public_key');
                    break;
                default:
                    throw new Error(`Unknown user type: ${userType}`);
            }

            if (!user || !user.public_key) {
                throw new Error('User public key not found in database');
            }

            // Decrypt the stored public key (it's encrypted with internal AES key)
            publicKey = decryptAES(user.public_key, internalAesKey);
            console.log(`✅ Using stored ${userType} public key for response encryption`);
        }

        // Store the resolved public key for the next middleware
        if (publicKey) {
            res.locals.publicKey = publicKey;
            console.log('✅ Public key resolved and stored in res.locals');
        } else {
            console.log('ℹ️ No public key available - response will not be encrypted');
        }

        next();

    } catch (error) {
        console.error('❌ Public key resolution failed:', error);

        // Don't fail the request, just log the error and continue without encryption
        console.log('⚠️ Continuing without response encryption due to key resolution failure');
        next();
    }
};

/**
 * Middleware to encrypt the response data
 * 
 * This is the SECOND stage of response encryption. It takes the public key
 * resolved by the previous middleware and encrypts the response.
 * 
 * If no public key is available, the response is sent unencrypted.
 * 
 * Usage:
 * ```typescript
 * router.post('/endpoint', decryptRequest, controller, resolvePublicKey, encryptResponse);
 * ```
 */
export const encryptResponse = (req: Request, res: Response, next: NextFunction): void => {
    // Store original json method
    const originalJson = res.json;

    // Override the json method to intercept the response
    res.json = function (data: any) {
        try {
            const publicKey = res.locals.publicKey;

            // If no public key available, send response unencrypted
            if (!publicKey) {
                console.log('ℹ️ No public key available - sending unencrypted response');
                return originalJson.call(this, data);
            }

            // Generate a random AES key for this response
            const responseAesKey = generateAESKey();

            // Convert response data to JSON string and encrypt with AES
            const responseJson = JSON.stringify(data);
            const encryptedData = encryptAES(responseJson, responseAesKey);

            // Encrypt the AES key with the resolved public key
            const encryptedKey = encryptRSA(responseAesKey, publicKey);

            // Send the encrypted response
            const encryptedResponse = {
                data: encryptedData,
                key: encryptedKey
            };

            console.log('✅ Response encrypted successfully');
            return originalJson.call(this, encryptedResponse);

        } catch (error) {
            console.error('❌ Response encryption failed:', error);

            // Fall back to sending unencrypted response on encryption failure
            console.log('⚠️ Falling back to unencrypted response due to encryption failure');
            return originalJson.call(this, data);
        }
    };

    next();
};
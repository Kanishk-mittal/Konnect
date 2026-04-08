import { Request, Response } from 'express';
import { externalAesKey } from '../../constants/keys';
import { encryptRSA } from '../../utils/encryption/rsa.utils';
import { KeyManager } from '../../utils/encryption/key-manager.utils';
import UserModel from '../../models/user.model';
import { verifyHash } from '../../utils/encryption/hash.utils';
import { generateRecoveryKeyService } from '../../services/user.services';

/**
 * Controller to handle AES external key encryption
 * Encrypts the external AES key with the user's public key
 */
export const getExternalAESKey = async (req: Request, res: Response): Promise<void> => {
    try {
        const user_key = req.body.publicKey;

        if (!user_key) {
            res.status(400).json({
                status: false,
                error: "Public key is required"
            });
            return;
        }

        const aesKey = encryptRSA(externalAesKey, user_key);

        res.status(200).json({
            status: true,
            aesKey
        });

    } catch (error) {
        console.error("Encryption error:", error);
        res.status(500).json({
            status: false,
            error: "Failed to encrypt the key",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

/**
 * Controller to handle RSA public key retrieval
 * Returns the current public key from KeyManager and attempts key reroll
 */
export const getRSAPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
        // Attempt to reroll keys if 5+ minutes have passed
        const rerollSuccess = KeyManager.reroll();
        if (rerollSuccess) {
            console.log("🔄 Keys automatically rerolled due to 5+ minute interval");
        }

        const publicKey = KeyManager.getCurrentPublicKey();
        const keyId = KeyManager.getCurrentKeyId();

        if (!publicKey) {
            res.status(500).json({
                status: false,
                error: "Public key not available",
                message: "KeyManager not properly initialized"
            });
            return;
        }

        res.status(200).json({
            status: true,
            publicKey,
            keyId,
        });

    } catch (error) {
        console.error("Error retrieving public key:", error);
        res.status(500).json({
            status: false,
            error: "Failed to retrieve public key",
            message: error instanceof Error ? error.message : "Internal server error"
        });
    }
};

/**
 * Controller to generate a new recovery key for a user.
 * Requires the user's current password for verification.
 */
export const generateRecoveryKey = async (req: Request, res: Response): Promise<void> => {
    try {
        const { password } = req.body;
        const userId = req.user?.id;

        if (!password) {
            res.status(400).json({
                status: false,
                message: 'Password is required to generate a recovery key.'
            });
            return;
        }

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Unauthorized. Please log in again.'
            });
            return;
        }

        // 1. Find the user
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        // 2. Verify password
        const isPasswordValid = await verifyHash(password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid password.'
            });
            return;
        }

        // 3. Call the service to regenerate recovery keys
        const result = await generateRecoveryKeyService(user as any, password);

        if (!result.status) {
            res.status(500).json({
                status: false,
                message: result.error || 'Failed to generate recovery key.'
            });
            return;
        }

        // 4. Return the new recovery key
        // encryptResponse middleware will handle encryption if client publicKey is provided
        res.status(200).json({
            status: true,
            message: 'Recovery key generated successfully.',
            data: {
                recoveryKey: result.recoveryKey
            }
        });

    } catch (error) {
        console.error('Error generating recovery key:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while generating recovery key.'
        });
    }
};

import { Request, Response } from 'express';
import { externalAesKey } from '../../constants/keys';
import { encryptRSA } from '../../utils/encryption/rsa.utils';
import { KeyManager } from '../../utils/encryption/key-manager.utils';
import UserModel from '../../models/user.model';
import { verifyHash } from '../../utils/encryption/hash.utils';
import { generateRecoveryKeyService, recoverPasswordService } from '../../services/user.services';
import { validateRecoveryPasswordData } from '../../inputSchema/user.schema';
import { OTP } from '../../utils/otp.utils';
import { sendOTPEmail as sendOTP } from "../../utils/mailer.utils";

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

/**
 * Controller to recover password using a recovery key and OTP.
 */
export const recoverPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const validation = validateRecoveryPasswordData(req.body);

        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const { id, collegeCode, recoveryKey, newPassword, otp } = validation.data;

        // 1. Find the user
        const user = await UserModel.findOne({ id, college_code: collegeCode });
        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        // 2. Verify OTP
        const isOTPValid = OTP.verifyOTP(user.email_id, otp);
        if (!isOTPValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid or expired OTP.'
            });
            return;
        }

        // 3. Call the service to recover password
        const result = await recoverPasswordService(user as any, recoveryKey, newPassword);

        if (!result.status) {
            res.status(500).json({
                status: false,
                message: result.error || 'Failed to recover password.'
            });
            return;
        }

        // 4. Return the new recovery key
        res.status(200).json({
            status: true,
            message: 'Password recovered successfully. Please save your new recovery key.',
            data: {
                recoveryKey: result.recoveryKey
            }
        });

    } catch (error) {
        console.error('Error recovering password:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while recovering password.'
        });
    }
};

export const sendOTPEmail = async (req: Request, res: Response) => {
    console.log('Received request to send OTP email with body:', req.body);
    const id: string = req.body.id;
    const collegeCode: string = req.body.collegeCode;

    if (!id || !collegeCode) {
        return res.status(400).json({
            status: false,
            message: 'userId is required'
        });
    }

    try {
        // 1. Find the user
        const user = await UserModel.findOne({ "id": id, "college_code": collegeCode });
        if (!user) {
            return res.status(404).json({
                status: false,
                message: 'User not found.'
            });
        }
        const email = user.email_id;

        // 2. Generate OTP and store it with an expiration time
        const result = await sendOTP(email, 'Password Recovery OTP');
        if (result.status) {
            return res.status(200).json({
                status: true,
                message: 'OTP sent successfully'
            });
        } else {
            return res.status(500).json({
                status: false,
                message: 'Failed to send OTP'
            });
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while sending OTP'
        });
    }
}

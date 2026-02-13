import { Request, Response } from 'express';
// import { OTP } from '../../utils/otp.utils';
import { validateAdminLoginData, AdminLoginData } from '../../inputSchema/admin.schema';
import { verifyHash } from '../../utils/encryption/hash.utils';
// import { encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { generateAESKeyFromString, decryptAES } from '../../utils/encryption/aes.utils';
// import { sendOTPEmail } from '../../utils/mailer.utils';
import UserModel from '../../models/user.model';
// import { checkExistingAdmin } from '../../services/admin.services';
// import type { AdminDocument } from '../../models/admin.model';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';

// Admin Login Controller
export const adminLoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const validation = validateAdminLoginData(req.body);

        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const loginData = validation.data;

        // Client's public key (if provided) is stored by decryptRequest middleware
        const clientPublicKey = (req as any).clientPublicKey;

        // Find user by college code and ID (which is passed as 'username' in login input)
        const user = await UserModel.findOne({
            user_type: 'admin',
            college_code: loginData.collegeCode,
            id: loginData.username
        });

        if (!user) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Verify password
        const isPasswordValid = await verifyHash(loginData.password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid password.'
            });
            return;
        }

        // Set JWT token
        const jwtPayload = { type: 'admin', id: user._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Decrypt private key from database
        const privateKey = decryptAES(user.private_key, generateAESKeyFromString(loginData.password));

        // Return success response with sensitive data
        // The encryptResponse middleware will automatically encrypt this if a public key is available
        res.status(200).json({
            status: true,
            message: 'Login successful!',
            data: {
                id: user._id.toString(),
                privateKey: privateKey
            },
            // Include public key in response so resolvePublicKey middleware can use it
            publicKey: clientPublicKey
        });
    } catch (error) {
        console.error('Error in admin login:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Admin Logout Controller
export const adminLogoutController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Clear the auth_token cookie
        res.clearCookie('auth_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });
        res.status(200).json({
            status: true,
            message: 'Logged out successfully.'
        });
    } catch (error) {
        console.error('Error during admin logout:', error);
        res.status(500).json({
            status: false,
            message: 'An error occurred during logout.'
        });
    }
};
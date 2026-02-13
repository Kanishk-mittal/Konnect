import { Request, Response } from 'express';
// import { OTP } from '../../utils/otp.utils';
import { validateAdminLoginData, AdminLoginData } from '../../inputSchema/admin.schema';
import { verifyHash } from '../../utils/encryption/hash.utils';
// import { encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { generateAESKeyFromString, decryptAES } from '../../utils/encryption/aes.utils';
// import { sendOTPEmail } from '../../utils/mailer.utils';
import AdminModel from '../../models/admin.model';
import UserModel from '../../models/user.model';
// import { checkExistingAdmin } from '../../services/admin.services';
// import type { AdminDocument } from '../../models/admin.model';
import { internalAesKey } from '../../constants/keys';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';
import { isCloudinaryConfigured, uploadAndCleanup } from '../../utils/cloudinary.utils';

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

export const sendAdminProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params; // Get admin ID from URL parameters
        if (!adminId) {
            res.status(400).json({
                status: false,
                message: 'Admin ID is required.'
            });
            return;
        }

        const admin = await AdminModel.findById(adminId);
        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Send profile picture URL or null if not set
        res.status(200).json({
            status: true,
            profilePicture: admin.profile_picture
        });
    } catch (error) {
        console.error('Error fetching admin profile picture:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching profile picture.'
        });
    }
};

/**
 * Get admin public details (username, email, college code)
 * No authentication required as this is public data
 */
export const getAdminDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params;

        // Find admin by ID and select only public fields
        const admin = await AdminModel.findById(adminId).select('username email_id college_code');

        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Decrypt the email since it's stored encrypted
        const decryptedEmail = decryptAES(admin.email_id, internalAesKey);

        res.status(200).json({
            status: true,
            message: 'Admin details retrieved successfully.',
            data: {
                username: admin.username,
                email: decryptedEmail,
                collegeCode: admin.college_code
            }
        });

    } catch (error) {
        console.error('Error fetching admin details:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching admin details.'
        });
    }
};

/**
 * Get admin details from JWT token
 * Requires authentication
 */
export const getAdminDetailsFromJWT = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated'
            });
            return;
        }

        // Find admin by ID from JWT token and select only public fields
        const admin = await AdminModel.findById(req.user.id).select('username email_id college_code');

        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Decrypt the email since it's stored encrypted
        const decryptedEmail = decryptAES(admin.email_id, internalAesKey);

        res.status(200).json({
            status: true,
            message: 'Admin details retrieved successfully.',
            data: {
                userId: req.user.id,
                username: admin.username,
                email: decryptedEmail,
                collegeCode: admin.college_code
            }
        });

    } catch (error) {
        console.error('Error fetching admin details from JWT:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching admin details.'
        });
    }
};

/**
 * Update admin profile picture
 * Requires authentication - gets admin ID from JWT token
 */
export const updateAdminProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get admin ID from authenticated user (from JWT)
        const adminId = req.user?.id;

        if (!adminId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find admin
        const admin = await AdminModel.findById(adminId);
        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Handle optional local file upload + optional Cloudinary push
        let profilePictureUrl: string | undefined;

        if ((req as any).file) {
            const localPath = (req as any).file.path as string;

            if (isCloudinaryConfigured()) {
                const uploaded = await uploadAndCleanup(localPath, { folder: 'konnect/profiles' });
                if (uploaded.success && uploaded.secure_url) {
                    profilePictureUrl = uploaded.secure_url;
                } else {
                    profilePictureUrl = localPath;
                }
            } else {
                profilePictureUrl = localPath;
            }
        }

        if (!profilePictureUrl) {
            res.status(400).json({
                status: false,
                message: 'No image file provided.'
            });
            return;
        }

        // Update admin profile picture
        admin.profile_picture = profilePictureUrl;
        await admin.save();

        res.status(200).json({
            status: true,
            message: 'Profile picture updated successfully.',
            data: {
                profilePicture: profilePictureUrl
            }
        });

    } catch (error) {
        console.error('Error updating admin profile picture:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while updating profile picture.'
        });
    }
};
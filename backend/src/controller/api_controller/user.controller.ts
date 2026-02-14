import { Request, Response } from 'express';
import UserModel from '../../models/user.model';
import { isCloudinaryConfigured, uploadAndCleanup } from '../../utils/cloudinary.utils';
import { sendOTPEmail } from '../../utils/mailer.utils';
import { OTP } from '../../utils/otp.utils';
import { createHash, verifyHash } from '../../utils/encryption/hash.utils';
import { validateChangePasswordData } from '../../inputSchema/user.schema';
import { updateCryptographicFields } from '../../services/user.services';

/**
 * Get profile picture for a specific user by their ID
 */
export const getUserProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        if (!userId) {
            res.status(400).json({
                status: false,
                message: 'User ID is required.'
            });
            return;
        }

        const user = await UserModel.findById(userId).select('profile_picture');

        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            profilePicture: user.profile_picture
        });
    } catch (error) {
        console.error('Error fetching user profile picture:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching profile picture.'
        });
    }
};

/**
 * Get public details (username, email, college code) for a specific user
 */
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        if (!userId) {
            res.status(400).json({
                status: false,
                message: 'User ID is required.'
            });
            return;
        }

        const user = await UserModel.findById(userId).select('username email_id college_code user_type');

        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        // Return user details with plain text email
        res.status(200).json({
            status: true,
            message: 'User details retrieved successfully.',
            data: {
                username: user.username,
                email: user.email_id,
                collegeCode: user.college_code,
                userType: user.user_type
            }
        });
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching user details.'
        });
    }
};

/**
 * Get current user details from JWT token
 */
export const getMyDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user || !req.user.id) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find user by ID (from JWT)
        const user = await UserModel.findById(req.user.id).select('username email_id college_code user_type');

        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        // Return user details with plain text email
        res.status(200).json({
            status: true,
            message: 'User details retrieved successfully.',
            data: {
                userId: req.user.id,
                username: user.username,
                email: user.email_id,
                collegeCode: user.college_code,
                userType: user.user_type
            }
        });

    } catch (error) {
        console.error('Error fetching own details from JWT:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching user details.'
        });
    }
};

/**
 * Update current user's profile picture
 * Requires authentication - gets user ID from JWT token
 */
export const updateProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated user (from JWT)
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
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

        // Update profile picture using findByIdAndUpdate
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { profile_picture: profilePictureUrl },
            { new: true }
        );

        if (!updatedUser) {
            res.status(404).json({
                status: false,
                message: 'User not found during update.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Profile picture updated successfully.',
            data: {
                profilePicture: profilePictureUrl
            }
        });

    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while updating profile picture.'
        });
    }
};

/**
 * Request OTP for password change
 * Requires authentication - sends OTP to user's registered email
 */
export const requestPasswordChangeOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated user (from JWT)
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find user
        const user = await UserModel.findById(userId).select('email_id');
        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        // Send OTP to user email
        const otpResult = await sendOTPEmail(user.email_id, 'OTP for Password Change - Konnect');

        if (!otpResult.status) {
            res.status(500).json({
                status: false,
                message: 'Failed to send OTP. Please try again.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'OTP sent successfully to your registered email.'
        });

    } catch (error) {
        console.error('Error requesting password change OTP:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while requesting OTP.'
        });
    }
};

/**
 * Change user password with OTP verification
 * Requires authentication - verifies OTP and updates password
 */
export const changePasswordWithOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user ID from authenticated user (from JWT)
        const userId = req.user?.id;

        // Use Zod schema to validate input
        const validation = validateChangePasswordData(req.body);

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const { previousPassword, newPassword, otp } = validation.data;

        // Find user - select fields needed for crypto update
        const user = await UserModel.findById(userId).select('email_id password_hash private_key');
        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        // Verify previous password
        const isPreviousPasswordValid = await verifyHash(previousPassword, user.password_hash);
        if (!isPreviousPasswordValid) {
            res.status(401).json({
                status: false,
                message: 'Incorrect previous password.'
            });
            return;
        }

        // Verify OTP using email from DB
        const isOTPValid = OTP.verifyOTP(user.email_id, otp);
        if (!isOTPValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid or expired OTP.'
            });
            return;
        }

        // Update cryptographic fields and save to DB (hashes password, re-encrypts private key, regenerates recovery keys)
        const cryptoUpdate = await updateCryptographicFields(user as any, previousPassword, newPassword);

        if (!cryptoUpdate.status) {
            res.status(500).json({
                status: false,
                message: cryptoUpdate.error || 'Failed to update cryptographic keys.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Password changed successfully.',
            data: {
                recoveryKey: cryptoUpdate.recoveryKey
            }
        });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while changing password.'
        });
    }
};

import { Request, Response } from 'express';
import UserModel from '../../models/user.model';
import { decryptAES } from '../../utils/encryption/aes.utils';
import { internalAesKey } from '../../constants/keys';
import { isCloudinaryConfigured, uploadAndCleanup } from '../../utils/cloudinary.utils';

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

        // Decrypt the email since it's stored encrypted
        const decryptedEmail = decryptAES(user.email_id, internalAesKey);

        res.status(200).json({
            status: true,
            message: 'User details retrieved successfully.',
            data: {
                username: user.username,
                email: decryptedEmail,
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

        // Decrypt the email
        const decryptedEmail = decryptAES(user.email_id, internalAesKey);

        res.status(200).json({
            status: true,
            message: 'User details retrieved successfully.',
            data: {
                userId: req.user.id,
                username: user.username,
                email: decryptedEmail,
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

        // Find user
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
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

        // Update profile picture
        user.profile_picture = profilePictureUrl;
        await user.save();

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

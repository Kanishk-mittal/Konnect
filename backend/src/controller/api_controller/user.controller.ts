import { Request, Response } from 'express';
import UserModel from '../../models/user.model';

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

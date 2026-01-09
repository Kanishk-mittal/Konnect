import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwt/jwt.utils';

const router = Router();

/**
 * GET /api/general/status
 * Returns the current authentication status of the user
 * Possible values: "Student", "Club", "Admin", "logged out"
 */
router.get('/status', (req: Request, res: Response) => {
    try {
        const token = req.cookies?.['auth_token'];

        if (!token) {
            res.status(200).json({
                status: true,
                userStatus: 'logged out'
            });
            return;
        }

        const secret = getJwtSecret();

        try {
            // Verify the token
            const decoded = jwt.verify(token, secret) as {
                id: string;
                type: string;
            };

            // Capitalize the first letter of the type
            const userStatus = decoded.type.charAt(0).toUpperCase() + decoded.type.slice(1);

            res.status(200).json({
                status: true,
                userStatus: userStatus // Will be "Student", "Club", or "Admin"
            });
        } catch (tokenError) {
            // Token is invalid or expired
            res.status(200).json({
                status: true,
                userStatus: 'logged out'
            });
        }
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Error checking authentication status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;

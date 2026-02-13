import { Router } from 'express';
import { 
    getUserProfilePicture, 
    getUserDetails,
    getMyDetails 
} from '../controller/api_controller/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Route to get profile picture by user ID
router.get('/profile-picture/:userId', getUserProfilePicture);

// Route to get public details by user ID
router.get('/details/:userId', getUserDetails);

// Route to get current user details (from JWT)
router.get('/details', authMiddleware, getMyDetails);

export default router;

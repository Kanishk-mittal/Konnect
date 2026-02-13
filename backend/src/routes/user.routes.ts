import { Router } from 'express';
import {
    getUserProfilePicture,
    getUserDetails,
    getMyDetails,
    updateProfilePicture
} from '../controller/api_controller/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { groupImageUpload, handleMulterError } from '../utils/multer.utils';

const router = Router();

// Route to get profile picture by user ID
router.get('/profile-picture/:userId', getUserProfilePicture);

// Route to get public details by user ID
router.get('/details/:userId', getUserDetails);

// Route to get current user details (from JWT)
router.get('/details', authMiddleware, getMyDetails);

// Route to update profile picture (authenticated)
router.post('/profile-picture',
    authMiddleware,                     // Verify JWT token
    groupImageUpload.single('image'),   // Handle file upload
    handleMulterError,                  // Handle multer errors
    updateProfilePicture                // Controller
);

export default router;

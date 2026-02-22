import { Router } from 'express';
import {
    getUserProfilePicture,
    getUserDetails,
    getMyDetails,
    updateProfilePicture,
    requestPasswordChangeOTP,
    changePasswordWithOTP,
    loginUser,
    logoutUser
} from '../controller/api_controller/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';
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

// Route to request password change OTP (authenticated)
router.get('/password/request-otp', authMiddleware, requestPasswordChangeOTP);

// Route to change password with OTP (authenticated)
router.post('/password/change',
    authMiddleware,
    decryptRequest,
    changePasswordWithOTP
);

// Unified Login Route (encrypted request/response)
router.post('/login', 
    decryptRequest, 
    loginUser, 
    resolvePublicKey, 
    encryptResponse
);

// Unified Logout Route
router.post('/logout', logoutUser);

export default router;

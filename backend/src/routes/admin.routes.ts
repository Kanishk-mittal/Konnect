import { Router, Request, Response } from 'express';
import {
    adminLoginController,
    sendAdminProfilePicture,
    getAdminDetails,
    getAdminDetailsFromJWT,
    adminLogoutController,
    updateAdminProfilePicture
} from '../controller/api_controller/admin.controller';
import {
    adminAuthMiddleware,
    authMiddleware
} from '../middleware/auth.middleware';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';
import { groupImageUpload, handleMulterError } from '../utils/multer.utils';

const router = Router();

// Routes with encryption middleware

router.post('/login',
    decryptRequest,        // Decrypt incoming encrypted request
    adminLoginController,  // Controller logic
    resolvePublicKey,      // Resolve public key for response encryption
    encryptResponse        // Encrypt sensitive response data
);
router.get("/profile/picture/:adminId", sendAdminProfilePicture); // Changed to GET with URL parameter
router.get("/details/:adminId", getAdminDetails); // New endpoint for admin details
router.get("/details", authMiddleware, adminAuthMiddleware, getAdminDetailsFromJWT); // Get admin details from JWT
router.get("/userID", authMiddleware, adminAuthMiddleware, (req: Request, res: Response): void => {
    if (!req.user) {
        res.status(401).json({
            status: false,
            message: 'User not authenticated'
        });
        return;
    }
    res.json({ userId: req.user.id });
}); // Endpoint to check if admin is logged in

// Update admin profile picture (authenticated)
router.post("/profile/picture",
    authMiddleware,                     // Verify JWT token
    adminAuthMiddleware,                // Verify admin role
    groupImageUpload.single('image'),   // Handle file upload
    handleMulterError,                  // Handle multer errors
    updateAdminProfilePicture           // Controller
);

// Logout endpoint to clear JWT cookie
router.post("/logout", adminLogoutController);

export default router;

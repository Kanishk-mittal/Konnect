import { Router, Request, Response } from 'express';
import {
    adminAuthMiddleware,
    authMiddleware
} from '../middleware/auth.middleware';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';

const router = Router();

// Routes with encryption middleware

// router.post('/login',
//     decryptRequest,        // Decrypt incoming encrypted request
//     adminLoginController,  // Controller logic
//     resolvePublicKey,      // Resolve public key for response encryption
//     encryptResponse        // Encrypt sensitive response data
// );

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

// Logout endpoint to clear JWT cookie
// router.post("/logout", adminLogoutController);

export default router;

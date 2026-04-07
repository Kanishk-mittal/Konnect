import { Router, Request, Response } from 'express';
import {
    adminAuthMiddleware,
    authMiddleware
} from '../middleware/auth.middleware';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';

const router = Router();


router.get("/userID", authMiddleware, adminAuthMiddleware, (req: Request, res: Response): void => {
    if (!req.user) {
        res.status(401).json({
            status: false,
            message: 'User not authenticated'
        });
        return;
    }
    res.json({ userId: req.user.id });
});

export default router;

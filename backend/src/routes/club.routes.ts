import { Router } from 'express';
import { clubLoginController } from '../controller/api_controller/club.controller';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';
import { adminAuthMiddleware } from '../middleware/auth.middleware';
import { groupImageUpload, handleMulterError } from '../utils/multer.utils';

const router = Router();

// Routes with encryption middleware
router.post('/login',
    decryptRequest,        // Decrypt incoming encrypted request
    clubLoginController,   // Controller logic
    resolvePublicKey,      // Resolve public key for response encryption
    encryptResponse        // Encrypt sensitive response data
);

// Health check endpoint for Clubs API
router.get('/health/check', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Clubs API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            login: 'POST /api/club/login'
        }
    });
});

export default router;

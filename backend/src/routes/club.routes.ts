import { Router } from 'express';
import { clubLoginController, createClubController, getClubsByCollegeCodeController } from '../controller/api_controller/club.controller';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth.middleware';
import { groupImageUpload, handleMulterError } from '../utils/multer.utils';

const router = Router();

// Get clubs by college code
router.get('/:collegeCode',
    authMiddleware,                     // Authenticate user
    adminAuthMiddleware,                // Verify user is admin
    getClubsByCollegeCodeController     // Controller logic
);

// Routes with encryption middleware
router.post('/login',
    decryptRequest,        // Decrypt incoming encrypted request
    clubLoginController,   // Controller logic
    resolvePublicKey,      // Resolve public key for response encryption
    encryptResponse        // Encrypt sensitive response data
);

// Create club route (requires admin authentication)
router.post('/create',
    authMiddleware,                   // Authenticate and populate req.user
    adminAuthMiddleware,              // Verify user is admin
    groupImageUpload.single('image'), // Handle optional image upload
    handleMulterError,                // Handle multer errors
    decryptRequest,                   // Decrypt incoming encrypted request
    createClubController              // Controller logic
);

// Health check endpoint for Clubs API
router.get('/health/check', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Clubs API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            login: 'POST /api/club/login',
            create: 'POST /api/club/create',
            getByCollegeCode: 'GET /api/club/:collegeCode'
        }
    });
});

export default router;

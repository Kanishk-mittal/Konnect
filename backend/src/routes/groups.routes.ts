import { Router, Request, Response } from 'express';
import { createGroupController, getGroupsByCollegeCodeController, deleteGroupController } from '../controller/api_controller/groups.controller';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth.middleware';
import { groupImageUpload, handleMulterError } from '../utils/multer.utils';

const router = Router();

// Get groups by college code
router.get('/:collegeCode',
    authMiddleware,                    // authenticate user
    adminAuthMiddleware,               // verify user is admin
    getGroupsByCollegeCodeController   // controller logic
);

// Create a group (supports optional image upload)
router.post('/create',
    authMiddleware,                    // authenticate and populate req.user
    adminAuthMiddleware,               // verify user is admin
    groupImageUpload.single('image'),  // image is sent unencrypted (handled before decrypt)
    handleMulterError,                 // handle multer-specific errors
    decryptRequest,                    // decrypt only the JSON payload
    createGroupController,             // controller logic
    resolvePublicKey,                  // prepare for response encryption
    encryptResponse                    // encrypt response if public key present
);

// Delete a group
router.delete('/delete/:groupId',
    authMiddleware,                    // authenticate user
    adminAuthMiddleware,               // verify user is admin
    decryptRequest,                    // decrypt request body (contains groupType)
    deleteGroupController              // controller logic
);

// Health check endpoint for groups API (basic status check)
router.get('/health/check', (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Groups API is running',
        timestamp: new Date().toISOString(),
        note: 'Routes will be added as needed'
    });
});

export default router;
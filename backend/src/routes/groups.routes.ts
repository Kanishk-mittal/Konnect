import { Router } from 'express';
import { createGroupController, getUserGroupsController, deleteGroupController } from '../controller/api_controller/groups.controller';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth.middleware';
import { groupImageUpload, handleMulterError } from '../utils/multer.utils';

const router = Router();

// Get groups created by the authenticated user
router.get('/',
    authMiddleware,                    // authenticate user
    getUserGroupsController            // controller logic
);

// Create a group (supports optional image upload) - Accessible by both admin and club
router.post('/create',
    authMiddleware,                    // authenticate and populate req.user
    groupImageUpload.single('image'),  // image is sent unencrypted (handled before decrypt)
    handleMulterError,                 // handle multer-specific errors
    decryptRequest,                    // decrypt only the JSON payload
    createGroupController,             // controller logic
    resolvePublicKey,                  // prepare for response encryption
    encryptResponse                    // encrypt response if public key present
);

// Delete a group - Accessible by admin or group admin
router.delete('/delete/:groupId',
    authMiddleware,                    // authenticate user
    decryptRequest,                    // decrypt request body (contains groupType)
    deleteGroupController              // controller logic (checks permissions internally)
);

export default router;
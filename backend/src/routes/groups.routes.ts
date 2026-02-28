import { Router } from 'express';
import { createGroupController, getUserGroupsController, deleteChatGroupController, deleteAnnouncementGroupController } from '../controller/api_controller/groups.controller';
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

// Delete a chat group - only group admin members can delete
router.delete('/chat/delete/:groupId',
    authMiddleware,                    // authenticate user
    deleteChatGroupController          // controller logic
);

// Delete an announcement group - only group admin members can delete
router.delete('/announcement/delete/:groupId',
    authMiddleware,                    // authenticate user
    deleteAnnouncementGroupController  // controller logic
);

export default router;
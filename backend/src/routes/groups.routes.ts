import { Router } from 'express';
import { createGroupController, getUserGroupsController, deleteChatGroupController, deleteAnnouncementGroupController, getChatGroupInfoController, getAnnouncementGroupInfoController, updateChatGroupController, updateAnnouncementGroupController, getMemberChatGroupsController, getMemberAnnouncementGroupsController } from '../controller/api_controller/groups.controller';
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

// Get chat groups user is a member of
router.get('/member-of/chat',
    authMiddleware,
    getMemberChatGroupsController
);

// Get announcement groups user is a member of
router.get('/member-of/announcement',
    authMiddleware,
    getMemberAnnouncementGroupsController
);

// Get chat group info
router.get('/chat/info/:groupId',
    authMiddleware,
    getChatGroupInfoController
);

// Get announcement group info
router.get('/announcement/info/:groupId',
    authMiddleware,
    getAnnouncementGroupInfoController
);

// Update a chat group - only group admin members can update
router.put('/chat/update/:groupId',
    authMiddleware,
    groupImageUpload.single('image'),
    handleMulterError,
    updateChatGroupController
);

// Update an announcement group - only group admin members can update
router.put('/announcement/update/:groupId',
    authMiddleware,
    groupImageUpload.single('image'),
    handleMulterError,
    updateAnnouncementGroupController
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
import { Router } from 'express';
import {
    clubLoginController,
    clubLogoutController,
    createClubController,
    getClubsByCollegeCodeController,
    deleteClubController,
    getClubDetailsController,
    getClubDetailsFromJWTController,
    getClubMembersController,
    getClubBlockedStudentsController,
    getClubGroupsController,
    addClubMembersController,
    removeClubMemberController,
    removeClubMembersBulkController,
    blockClubStudentsBulkController,
    unblockClubStudentController,
    unblockClubStudentsBulkController
} from '../controller/api_controller/club.controller';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';
import { authMiddleware, adminAuthMiddleware, clubAuthMiddleware } from '../middleware/auth.middleware';
import { groupImageUpload, handleMulterError } from '../utils/multer.utils';
import { Request, Response } from 'express';

const router = Router();

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

// Delete club route (requires admin authentication)
router.delete('/delete/:clubId',
    authMiddleware,                   // Authenticate user
    adminAuthMiddleware,              // Verify user is admin
    deleteClubController              // Controller logic
);

// Get club user ID from JWT (requires club authentication)
router.get("/userID", authMiddleware, clubAuthMiddleware, (req: Request, res: Response): void => {
    if (!req.user) {
        res.status(401).json({
            status: false,
            message: 'User not authenticated'
        });
        return;
    }
    res.json({ userId: req.user.id });
});
// Logout endpoint to clear JWT cookie
router.post('/logout', clubLogoutController);

// Get club details by club ID
router.get('/details/:clubId', getClubDetailsController);

// Get club details from JWT (requires club authentication)
router.get('/details',
    authMiddleware,
    clubAuthMiddleware,
    getClubDetailsFromJWTController
);

// Get club members (requires club authentication)
router.get('/members/:clubId',
    authMiddleware,
    clubAuthMiddleware,
    getClubMembersController
);

// Get blocked students for club (requires club authentication)
router.get('/blocked/:clubId',
    authMiddleware,
    clubAuthMiddleware,
    getClubBlockedStudentsController
);

// Get groups created by club (requires club authentication)
router.get('/groups/:clubId',
    authMiddleware,
    clubAuthMiddleware,
    getClubGroupsController
);

// Add members to club (requires club authentication)
router.post('/members/add',
    authMiddleware,
    clubAuthMiddleware,
    decryptRequest,
    addClubMembersController
);

// Remove member from club (requires club authentication)
router.delete('/members/remove',
    authMiddleware,
    clubAuthMiddleware,
    decryptRequest,
    removeClubMemberController
);

// Remove multiple members from club by CSV (requires club authentication)
router.post('/members/remove-bulk',
    authMiddleware,
    clubAuthMiddleware,
    decryptRequest,
    removeClubMembersBulkController
);

// Block multiple students by CSV (requires club authentication)
router.post('/students/block-bulk',
    authMiddleware,
    clubAuthMiddleware,
    decryptRequest,
    blockClubStudentsBulkController
);

// Unblock a student (requires club authentication)
router.post('/students/unblock',
    authMiddleware,
    clubAuthMiddleware,
    decryptRequest,
    unblockClubStudentController
);

// Unblock multiple students by CSV (requires club authentication)
router.post('/students/unblock-bulk',
    authMiddleware,
    clubAuthMiddleware,
    decryptRequest,
    unblockClubStudentsBulkController
);

// Get clubs by college code (admin only) - Must be last due to dynamic parameter
router.get('/:collegeCode',
    authMiddleware,
    adminAuthMiddleware,
    getClubsByCollegeCodeController
);

export default router;

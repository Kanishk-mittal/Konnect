import { Router } from 'express';
import {
    studentLoginController,
    studentLogoutController,
    getStudentByCollegeCode,
    getBlockedStudentsByCollegeCode,
    bulkStudentRegistration,
    deleteStudent,
    deleteMultipleStudents,
    toggleStudentBlockStatus,
    blockMultipleStudents,
    unblockMultipleStudents
} from '../controller/api_controller/student.controller';
import { adminAuthMiddleware, authMiddleware } from '../middleware/auth.middleware';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';

const router = Router();

// Routes with encryption middleware
router.post('/login', decryptRequest, studentLoginController, resolvePublicKey, encryptResponse);

// Logout endpoint to clear JWT cookie
router.post('/logout', studentLogoutController);

router.get('/list', authMiddleware, getStudentByCollegeCode);

router.get('/blocked', authMiddleware, adminAuthMiddleware, getBlockedStudentsByCollegeCode);

router.post('/addMultiple', authMiddleware, adminAuthMiddleware, decryptRequest, bulkStudentRegistration, encryptResponse);

router.delete('/delete', authMiddleware, adminAuthMiddleware, decryptRequest, deleteStudent);

router.delete('/delete-multiple', authMiddleware, adminAuthMiddleware, decryptRequest, deleteMultipleStudents);

router.post('/toggle-block', authMiddleware, adminAuthMiddleware, decryptRequest, toggleStudentBlockStatus);

router.post('/block-multiple', authMiddleware, adminAuthMiddleware, decryptRequest, blockMultipleStudents);

router.post('/unblock-multiple', authMiddleware, adminAuthMiddleware, decryptRequest, unblockMultipleStudents);

export default router;

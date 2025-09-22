import { Router } from 'express';
import {
    studentLoginController,
    getStudentByCollegeCode,
    bulkStudentRegistration,
    deleteStudent,
    deleteMultipleStudents
} from '../controller/api_controller/student.controller';
import { adminAuthMiddleware, authMiddleware } from '../middleware/auth.middleware';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';

const router = Router();

// Routes with encryption middleware
router.post('/login', decryptRequest, studentLoginController, resolvePublicKey, encryptResponse);
router.get('/details/:collegeCode', authMiddleware, getStudentByCollegeCode);
router.post('/addMultiple', authMiddleware, adminAuthMiddleware, decryptRequest, bulkStudentRegistration, encryptResponse);
router.delete('/delete', authMiddleware, adminAuthMiddleware, decryptRequest, deleteStudent);
router.delete('/delete-multiple', authMiddleware, adminAuthMiddleware, decryptRequest, deleteMultipleStudents);

export default router;

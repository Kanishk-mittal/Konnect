import { Router } from 'express';
import { studentLoginController, getStudentByCollegeCode, bulkStudentRegistration } from '../controller/api_controller/student.controller';
import { adminAuthMiddleware, authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', studentLoginController);
router.get('/details/:collegeCode', authMiddleware, getStudentByCollegeCode);
router.post('/addMultiple', authMiddleware, adminAuthMiddleware, bulkStudentRegistration);

export default router;

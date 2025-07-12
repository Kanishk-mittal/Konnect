import { Router } from 'express';
import { studentLoginController } from '../controller/api_controller/student.controller';

const router = Router();

router.post('/login', studentLoginController);

export default router;

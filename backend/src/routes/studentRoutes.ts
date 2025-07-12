import { Router } from 'express';
import { studentLoginController } from '../controller/api_controller/studentController';

const router = Router();

router.post('/login', studentLoginController);

export default router;

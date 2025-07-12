import { Router } from 'express';
import { registerController, adminLoginController } from '../controller/api_controller/admin.controller';

const router = Router();

router.post('/register', registerController);
router.post('/login', adminLoginController);

export default router;

import { Router } from 'express';
import { registerController } from '../controller/api_controller/adminController';

const router = Router();

router.post('/register',registerController);

export default router;

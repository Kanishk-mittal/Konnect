import { Router } from 'express';
import { clubLoginController } from '../controller/api_controller/club.controller';

const router = Router();

router.post('/login', clubLoginController);

export default router;

import { Router } from 'express';
import { pingController } from '../controller/api_controller/checkup';

const router = Router();

router.get('/',pingController);

export default router;

import { Router } from 'express';
import { pingControler } from '../controller/api_controller/checkup';

const router = Router();

router.get('/',pingControler);

export default router;

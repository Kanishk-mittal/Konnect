import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getOfflineMessagesController } from '../controller/api_controller/message.controller';

const router = Router();

// Route to get offline messages for the authenticated user
router.get('/offline',
    authMiddleware,
    getOfflineMessagesController
);

export default router;

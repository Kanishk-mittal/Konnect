import { Router } from 'express';
import { getUserProfilePicture } from '../controller/api_controller/user.controller';

const router = Router();

// Route to get profile picture by user ID
router.get('/profile-picture/:userId', getUserProfilePicture);

export default router;

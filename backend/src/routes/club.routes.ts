import { Router } from 'express';
import { clubLoginController } from '../controller/api_controller/club.controller';

const router = Router();

router.post('/login', clubLoginController);
// TODO: Implement club registration and OTP functionality
// router.post('/register', registerClubController);
// router.post('/otp', sendClubRegistrationOTP);

export default router;

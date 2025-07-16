import { Router } from 'express';
import { registerController, adminLoginController,sendRegistrationOTP,sendAdminProfilePicture } from '../controller/api_controller/admin.controller';

const router = Router();

router.post('/register', registerController);
router.post('/login', adminLoginController);
router.post("/otp", sendRegistrationOTP); // Assuming you have a function to handle OTP registration
router.get("/profile/picture/:adminId", sendAdminProfilePicture); // Changed to GET with URL parameter
router.get("/checkLogin")

export default router;

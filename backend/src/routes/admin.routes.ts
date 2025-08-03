import { Router, Request, Response } from 'express';
import { 
    registerController, 
    adminLoginController, 
    sendRegistrationOTP, 
    sendAdminProfilePicture, 
    getAdminDetails,
    getAdminDetailsFromJWT 
} from '../controller/api_controller/admin.controller';
import {
    adminAuthMiddleware,
    authMiddleware
} from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerController);
router.post('/login', adminLoginController);
router.post("/otp", sendRegistrationOTP); // Assuming you have a function to handle OTP registration
router.get("/profile/picture/:adminId", sendAdminProfilePicture); // Changed to GET with URL parameter
router.get("/details/:adminId", getAdminDetails); // New endpoint for admin details
router.get("/details", authMiddleware, adminAuthMiddleware, getAdminDetailsFromJWT); // Get admin details from JWT
router.get("/userID", authMiddleware, adminAuthMiddleware, (req: Request, res: Response): void => {
    if (!req.user) {
        res.status(401).json({ 
            status: false, 
            message: 'User not authenticated' 
        });
        return;
    }
    res.json({ userId: req.user.id });
}); // Endpoint to check if admin is logged in

export default router;

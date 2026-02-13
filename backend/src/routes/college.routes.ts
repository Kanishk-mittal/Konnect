import { Router } from "express";
import {
    registerCollegeController,
    sendConfirmationOTP
} from '../controller/api_controller/college.controller';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';

const router = Router();

// Send OTP route
router.post('/otp', sendConfirmationOTP);

// Register college route (moved from admin.routes.ts)
router.post('/register-college',
    decryptRequest,        // Decrypt incoming encrypted request
    registerCollegeController,    // Controller logic
    resolvePublicKey,      // Resolve public key for response encryption
    encryptResponse        // Encrypt sensitive response data
);

export default router;

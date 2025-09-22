import { Router } from 'express';
import { clubLoginController } from '../controller/api_controller/club.controller';
import { decryptRequest } from '../middleware/encryption.middleware';
import { resolvePublicKey, encryptResponse } from '../middleware/responseEncryption.middleware';

const router = Router();

// Routes with encryption middleware
router.post('/login',
    decryptRequest,        // Decrypt incoming encrypted request
    clubLoginController,   // Controller logic
    resolvePublicKey,      // Resolve public key for response encryption
    encryptResponse        // Encrypt sensitive response data
);

export default router;

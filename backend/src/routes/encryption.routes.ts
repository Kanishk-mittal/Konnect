import { Router } from "express";
import { getExternalAESKey, getRSAPublicKey, generateRecoveryKey, recoverPassword, sendOTPEmail } from "../controller/api_controller/encryption.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { decryptRequest } from "../middleware/encryption.middleware";
import { encryptResponse } from "../middleware/responseEncryption.middleware";

const encryptionRoutes = Router();

encryptionRoutes.post("/aes/external-key", authMiddleware, getExternalAESKey);

encryptionRoutes.get("/rsa/publicKey", getRSAPublicKey);
encryptionRoutes.post("/recovery-key", authMiddleware, decryptRequest, generateRecoveryKey, encryptResponse)
encryptionRoutes.post("/recover-password", decryptRequest, recoverPassword, encryptResponse)
encryptionRoutes.post("/otp", sendOTPEmail)

export default encryptionRoutes;

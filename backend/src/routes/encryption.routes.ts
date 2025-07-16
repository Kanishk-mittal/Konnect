import { Router } from "express";
import { getExternalAESKey, getRSAPublicKey } from "../controller/api_controller/encryption.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const encryptionRoutes = Router();

encryptionRoutes.post("/aes/external-key", authMiddleware, getExternalAESKey);

encryptionRoutes.get("/rsa/publicKey", getRSAPublicKey);

export default encryptionRoutes;
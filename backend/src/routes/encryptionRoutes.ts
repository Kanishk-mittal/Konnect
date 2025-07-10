import { Router } from "express";
import { getExternalAESKey, getRSAPublicKey } from "../controller/api_controller/encryptionController";

const encryptionRoutes = Router();

encryptionRoutes.get("/aes/external-key", getExternalAESKey);

encryptionRoutes.get("/rsa/publicKey", getRSAPublicKey);

export default encryptionRoutes;
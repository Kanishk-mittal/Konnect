import { Request, Response } from 'express';
import { externalAesKey } from '../../constants/keys';
import { encryptRSA } from '../../utils/encryption/rsa.utils';
import { KeyManager } from '../../utils/encryption/key-manager.utils';

/**
 * Controller to handle AES external key encryption
 * Encrypts the external AES key with the user's public key
 */
export const getExternalAESKey = async (req: Request, res: Response): Promise<void> => {
    try {
        const user_key = req.body.publicKey;
        
        if (!user_key) {
            res.status(400).json({ 
                status: false,
                error: "Public key is required" 
            });
            return;
        }
        
        const aesKey = encryptRSA(externalAesKey, user_key);
        
        res.status(200).json({ 
            status: true,
            aesKey 
        });
        
    } catch (error) {
        console.error("Encryption error:", error);
        res.status(500).json({ 
            status: false,
            error: "Failed to encrypt the key",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
};

/**
 * Controller to handle RSA public key retrieval
 * Returns the current public key from KeyManager and attempts key reroll
 */
export const getRSAPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
        // Attempt to reroll keys if 5+ minutes have passed
        const rerollSuccess = KeyManager.reroll();
        if (rerollSuccess) {
            console.log("🔄 Keys automatically rerolled due to 5+ minute interval");
        }
        
        const publicKey = KeyManager.getCurrentPublicKey();
        const keyId = KeyManager.getCurrentKeyId();
        
        if (!publicKey) {
            res.status(500).json({ 
                status: false,
                error: "Public key not available", 
                message: "KeyManager not properly initialized" 
            });
            return;
        }
        
        res.status(200).json({ 
            status: true,
            publicKey,
            keyId,
        });
        
    } catch (error) {
        console.error("Error retrieving public key:", error);
        res.status(500).json({ 
            status: false,
            error: "Failed to retrieve public key",
            message: error instanceof Error ? error.message : "Internal server error"
        });
    }
};

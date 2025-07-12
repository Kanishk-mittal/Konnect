import { Request, Response } from 'express';
import { createHash } from '../../utils/encryption/hash.utils';
import { decryptRSA, encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { encryptAES, generateAESKeyFromString, decryptAES, generateAESKey } from '../../utils/encryption/aes.utils';
import ClubModel from '../../models/club.model';
import { KeyManager } from '../../utils/encryption/key-manager.utils';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';

// Types
type ClubLoginData = {
    collegeCode: string;
    clubName: string;
    password: string;
};

type EncryptedLoginData = {
    key: string;
    keyId: string;
    collegeCode: string;
    clubName: string;
    password: string;
    publicKey?: string; // Client's public key for secure response
};

type ClubRegistrationData = {
    clubName: string;
    collegeCode: string;
    mentorEmail: string;
    password: string;
    otp: string;
};

type EncryptedRegistrationData = {
    key: string;
    keyId: string;
    clubName: string;
    collegeCode: string;
    mentorEmail: string;
    password: string;
    otp: string;
};

// Club Login Controller
export const clubLoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        const encryptedData: EncryptedLoginData = req.body;

        // Validate encryption requirements
        if (!encryptedData.key || !encryptedData.keyId) {
            res.status(400).json({ 
                status: false, 
                message: 'Encryption key and key ID are required.' 
            });
            return;
        }

        // Get private key from KeyManager
        const userKey = KeyManager.getPrivateKey(encryptedData.keyId);
        if (!userKey) {
            res.status(400).json({
                status: false, 
                message: 'Invalid key ID.'
            });
            return;
        }

        // Decrypt AES key
        const userAESKey = decryptRSA(encryptedData.key, userKey);
        
        // Decrypt login data
        const loginData: ClubLoginData = {
            collegeCode: decryptAES(encryptedData.collegeCode, userAESKey),
            clubName: decryptAES(encryptedData.clubName, userAESKey),
            password: decryptAES(encryptedData.password, userAESKey)
        };

        // Validate input
        if (!loginData.clubName || !loginData.collegeCode || !loginData.password) {
            res.status(400).json({ 
                status: false, 
                message: 'College code, club name, and password are required.' 
            });
            return;
        }

        // Find club by club name and college code
        const club = await ClubModel.findOne({ 
            name: loginData.clubName,
            college_code: loginData.collegeCode
        });
        
        if (!club) {
            res.status(404).json({ 
                status: false, 
                message: 'Club not found.' 
            });
            return;
        }

        // Verify password
        const hashedPassword = await createHash(loginData.password);
        if (hashedPassword !== club.password_hash) {
            res.status(401).json({ 
                status: false, 
                message: 'Invalid password.' 
            });
            return;
        }

        // Set JWT token
        const jwtPayload = { type: 'club', id: club._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Check if client sent a public key for secure response
        if (encryptedData.publicKey) {
            try {
                // Get club's private key from database
                const clubPrivateKey = club.private_key;
                const clubId = club._id.toString();
                
                // Generate a new AES key for response encryption
                const responseAesKey = generateAESKey();
                
                // Encrypt sensitive data with AES key
                const encryptedPrivateKey = encryptAES(clubPrivateKey, responseAesKey);
                const encryptedId = encryptAES(clubId, responseAesKey);
                
                // Encrypt the AES key with client's public key
                const encryptedKey = encryptRSA(responseAesKey, encryptedData.publicKey);
                
                // Return encrypted data to client
                res.status(200).json({ 
                    status: true, 
                    message: 'Login successful!',
                    data: {
                        privateKey: encryptedPrivateKey,
                        id: encryptedId
                    },
                    key: encryptedKey
                });
            } catch (error) {
                console.error('Error encrypting response data:', error);
                // Fall back to simple response if encryption fails
                res.status(200).json({ 
                    status: true, 
                    message: 'Login successful!'
                });
            }
            return;
        }
        
        // Standard response if no public key was provided
        res.status(200).json({ 
            status: true, 
            message: 'Login successful!' 
        });
    } catch (error) {
        console.error('Error in club login:', error);
        res.status(500).json({ 
            status: false, 
            message: 'An unexpected error occurred.' 
        });
    }
};
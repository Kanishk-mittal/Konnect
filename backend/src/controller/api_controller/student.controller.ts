import { Request, Response } from 'express';
import { createHash } from '../../utils/encryption/hash.utils';
import { decryptRSA, encryptRSA } from '../../utils/encryption/rsa.utils';
import { decryptAES, encryptAES, generateAESKey } from '../../utils/encryption/aes.utils';
import UserModel from '../../models/user.model';
import { KeyManager } from '../../utils/encryption/key-manager.utils';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';

// Types
type StudentLoginData = {
    collegeCode: string;
    rollNumber: string;
    password: string;
};

type EncryptedLoginData = {
    key: string;
    keyId: string;
    collegeCode: string;
    rollNumber: string;
    password: string;
    publicKey?: string; // Client's public key for secure response
};

// Student Login Controller
export const studentLoginController = async (req: Request, res: Response): Promise<void> => {
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
        const serverKey = KeyManager.getPrivateKey(encryptedData.keyId);
        if (!serverKey) {
            res.status(400).json({
                status: false, 
                message: 'Invalid key ID.'
            });
            return;
        }

        // Decrypt AES key
        const clientAESKey = decryptRSA(encryptedData.key, serverKey);
        
        // Decrypt login data
        const loginData: StudentLoginData = {
            collegeCode: decryptAES(encryptedData.collegeCode, clientAESKey),
            rollNumber: decryptAES(encryptedData.rollNumber, clientAESKey),
            password: decryptAES(encryptedData.password, clientAESKey)
        };

        // Validate input
        if (!loginData.collegeCode || !loginData.rollNumber || !loginData.password) {
            res.status(400).json({ 
                status: false, 
                message: 'College code, roll number, and password are required.' 
            });
            return;
        }

        // Find student by college code and roll
        const student = await UserModel.findOne({ 
            college_code: loginData.collegeCode,
            roll: loginData.rollNumber
        });

        if (!student) {
            res.status(404).json({ 
                status: false, 
                message: 'Student not found.' 
            });
            return;
        }

        // Verify password
        const hashedPassword = await createHash(loginData.password);
        if (hashedPassword !== student.password_hash) {
            res.status(401).json({ 
                status: false, 
                message: 'Invalid password.' 
            });
            return;
        }

        // Set JWT token
        const jwtPayload = { type: 'student', id: student._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Check if client sent a public key for secure response
        if (encryptedData.publicKey) {
            try {
                // Get student's private key from database
                const studentPrivateKey = student.private_key as string;
                const studentId = student._id.toString();
                
                // Generate a new AES key for response encryption
                const responseAesKey = generateAESKey();
                
                // Encrypt sensitive data with AES key
                const encryptedPrivateKey = encryptAES(studentPrivateKey, responseAesKey);
                const encryptedId = encryptAES(studentId, responseAesKey);
                
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
        console.error('Error in student login:', error);
        res.status(500).json({ 
            status: false, 
            message: 'An unexpected error occurred.' 
        });
    }
};

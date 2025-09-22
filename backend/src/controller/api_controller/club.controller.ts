import { Request, Response } from 'express';
import { createHash, verifyHash } from '../../utils/encryption/hash.utils';
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

// Club Login Controller
export const clubLoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const loginData: ClubLoginData = req.body;

        // Client's public key (if provided) is stored by decryptRequest middleware
        const clientPublicKey = (req as any).clientPublicKey;

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
        const isPasswordValid = await verifyHash(loginData.password, club.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid password.'
            });
            return;
        }

        // Set JWT token
        const jwtPayload = { type: 'club', id: club._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Return success response with sensitive data
        // The encryptResponse middleware will automatically encrypt this if a public key is available
        res.status(200).json({
            status: true,
            message: 'Login successful!',
            data: {
                privateKey: club.private_key,
                id: club._id.toString()
            },
            // Include public key in response so resolvePublicKey middleware can use it
            publicKey: clientPublicKey
        });
    } catch (error) {
        console.error('Error in club login:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};
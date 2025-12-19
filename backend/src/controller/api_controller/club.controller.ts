import type { Request, Response } from 'express';
import { createHash, verifyHash } from '../../utils/encryption/hash.utils';
import { decryptRSA, encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { encryptAES, generateAESKeyFromString, decryptAES, generateAESKey } from '../../utils/encryption/aes.utils';
import ClubModel from '../../models/club.model';
import AdminModel from '../../models/admin.model';
import { KeyManager } from '../../utils/encryption/key-manager.utils';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';

// Types
type ClubLoginData = {
    collegeCode: string;
    clubName: string;
    password: string;
};

type CreateClubPayload = {
    clubName: string;
    email: string;
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

// Create Club Controller
export const createClubController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const payload: CreateClubPayload = req.body;

        // Validate input
        if (!payload.clubName || !payload.email || !payload.password) {
            res.status(400).json({
                status: false,
                message: 'Club name, email, and password are required.'
            });
            return;
        }

        // Get admin's college_code
        const admin = await AdminModel.findById(req.user?.id).select('college_code');
        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        const collegeCode = admin.college_code;

        // Check if club with same name already exists for this college
        const existingClub = await ClubModel.findOne({
            Club_name: payload.clubName,
            college_code: collegeCode
        });

        if (existingClub) {
            res.status(409).json({
                status: false,
                message: 'A club with this name already exists.'
            });
            return;
        }

        // Hash the password
        const passwordHash = await createHash(payload.password);

        // Generate RSA key pair for the club (for regular encryption)
        const [privateKey, publicKey] = generateRSAKeyPair();

        // Generate a separate RSA key pair for password recovery
        const [recoveryPrivateKey, recoveryPublicKey] = generateRSAKeyPair();

        // Encrypt the password with recovery public key to create recovery_password
        const recoveryPassword = encryptRSA(payload.password, recoveryPublicKey);

        // Handle optional local file upload + optional Cloudinary push
        let image:
            | { localPath: string; cloudUrl?: string }
            | undefined;

        if ((req as any).file) {
            const localPath = (req as any).file.path as string;
            image = { localPath };
            if (isCloudinaryConfigured()) {
                const uploaded = await uploadAndCleanup(localPath, { folder: 'konnect/clubs' });
                if (uploaded.success && uploaded.secure_url) {
                    image.cloudUrl = uploaded.secure_url;
                }
            }
        }

        // Choose icon value from cloud URL if available, else local
        const icon = image?.cloudUrl || image?.localPath || undefined;

        // Create the club
        const club = await ClubModel.create({
            Club_name: payload.clubName,
            college_code: collegeCode,
            email: payload.email,
            password_hash: passwordHash,
            recovery_password: recoveryPassword, // Encrypted password
            public_key: publicKey,
            private_key: privateKey
        });

        res.status(201).json({
            status: true,
            message: 'Club created successfully. Please save the recovery key securely!',
            data: {
                id: club._id.toString(),
                clubName: payload.clubName,
                email: payload.email,
                recoveryPrivateKey: recoveryPrivateKey // Send this to user to decrypt recovery_password later
            }
        });
    } catch (error) {
        console.error('Error in create club:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Get Clubs by College Code Controller
export const getClubsByCollegeCodeController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { collegeCode } = req.params;

        if (!collegeCode) {
            res.status(400).json({
                status: false,
                message: 'College code is required.'
            });
            return;
        }

        // Fetch all clubs for the college
        const clubs = await ClubModel.find({ college_code: collegeCode })
            .select('Club_name email')
            .lean();

        // Format response
        const formattedClubs = clubs.map(club => ({
            id: club._id.toString(),
            name: club.Club_name,
            email: club.email
        }));

        res.status(200).json({
            status: true,
            message: 'Clubs fetched successfully',
            data: formattedClubs
        });
    } catch (error) {
        console.error('Error in getClubsByCollegeCodeController:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};
import { Request, Response } from 'express';
import { OTP } from '../../utils/otp.utils';
import { ADMIN_REGISTRATION_RULES as validationRules } from '../../constants/rules';
import { createHash, verifyHash } from '../../utils/encryption/hash.utils';
import { decryptRSA, encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { encryptAES, generateAESKeyFromString, decryptAES, generateAESKey } from '../../utils/encryption/aes.utils';
import { sendOTPEmail } from '../../utils/mailer.utils';
import AdminModel from '../../models/admin.model';
import type { AdminDocument } from '../../models/admin.model';
import { internalAesKey } from '../../constants/keys';
import { KeyManager } from '../../utils/encryption/key-manager.utils';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';

// Types
type AdminRegistrationData = {
    collegeName: string;
    adminUsername: string;
    collegeCode: string;
    emailId: string;
    password: string;
    otp: string;
};

type AdminLoginData = {
    collegeCode: string;
    username: string;
    password: string;
};

// Validation helper function
const validateRegistrationData = (data: AdminRegistrationData): { status: boolean; message: string } => {
    // Check for required fields
    if (!data.collegeName || !data.collegeCode || !data.emailId || !data.adminUsername || !data.password) {
        return { status: false, message: 'All fields are required.' };
    }

    // Validate each field against its respective rule
    for (const [field, value] of Object.entries(data)) {
        const rule = validationRules[field];
        if (!rule) continue; // Skip if no rule defined for this field

        // Check minimum length
        if (rule.minLength && value.length < rule.minLength) {
            return {
                status: false,
                message: field === 'password'
                    ? `Password must be at least ${rule.minLength} characters long.`
                    : `${field} must be at least ${rule.minLength} characters long.`
            };
        }

        // Check exact length (when min and max are the same)
        if (rule.minLength && rule.maxLength && rule.minLength === rule.maxLength && value.length !== rule.minLength) {
            return {
                status: false,
                message: `${field} must be exactly ${rule.minLength} characters long.`
            };
        }

        // Check maximum length
        if (rule.maxLength && value.length > rule.maxLength) {
            return {
                status: false,
                message: `${field} must not exceed ${rule.maxLength} characters.`
            };
        }

        // Check regex pattern
        if (!rule.regex.test(value)) {
            return {
                status: false,
                message: rule.message
            };
        }
    }

    return { status: true, message: 'Validation successful' };
};



// Helper function to check for existing admin
const checkExistingAdmin = async (data: AdminRegistrationData): Promise<{ exists: boolean; message?: string }> => {
    const existingAdmin = await AdminModel.findOne({ college_code: data.collegeCode });

    if (existingAdmin) {
        let message = 'Registration failed. College is already registered.';
        return { exists: true, message };
    }

    return { exists: false };
};

// Helper function to create admin document
const createAdminDocument = async (data: AdminRegistrationData): Promise<{ 
    adminDoc: AdminDocument, 
    recoveryKey: string, 
    privateKey: string 
}> => {
    // Hash password
    const passwordHash = await createHash(data.password);

    // Create recovery password (user's password encrypted with RSA)
    const [recoveryKey, recoveryPublicKey] = generateRSAKeyPair();
    const recoveryPassword = encryptRSA(data.password, recoveryPublicKey);

    // Use await for the hash since it returns a Promise
    const recoveryKeyHash = await createHash(recoveryKey);

    // Generate user's RSA key pair
    const [privateKey, publicKey] = generateRSAKeyPair();

    // Create encrypted document
    // some values are not encrypted as they are not sensitive also they are used for searching
    return {
        adminDoc: {
            college_code: data.collegeCode,
            college_name: encryptAES(data.collegeName, internalAesKey),
            username: data.adminUsername,
            profile_picture: null, // Default to null, can be updated later
            email_id: encryptAES(data.emailId, internalAesKey),
            password_hash: passwordHash,
            recovery_password: recoveryPassword,
            private_key: encryptAES(privateKey, generateAESKeyFromString(data.password)),
            public_key: encryptAES(publicKey, internalAesKey),
            recovery_key_hash: recoveryKeyHash,
        },
        recoveryKey,
        privateKey,
    };
};

// Main registration controller
export const registerController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const data: AdminRegistrationData = req.body;
        
        // Client's public key (if provided) is stored by decryptRequest middleware
        const clientPublicKey = (req as any).clientPublicKey;

        // Validate registration data
        const validationResult = validateRegistrationData(data);
        if (!validationResult.status) {
            res.status(400).json({
                status: false,
                message: validationResult.message
            });
            return;
        }

        // Verify OTP
        if (!data.otp || !OTP.verifyOTP(data.emailId, data.otp)) {
            res.status(401).json({
                status: false,
                message: 'Invalid or expired OTP.'
            });
            return;
        }

        // Check for existing admin
        const existingCheck = await checkExistingAdmin(data);
        if (existingCheck.exists) {
            res.status(409).json({
                status: false,
                message: existingCheck.message
            });
            return;
        }

        // Create and save admin document
        const credential = await createAdminDocument(data);
        const newAdmin = new AdminModel(credential.adminDoc);
        await newAdmin.save();

        // Set JWT token for authentication
        const jwtPayload = {
            type: "admin",
            id: newAdmin._id.toString()
        };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry
        
        // Return success response with sensitive data
        // The encryptResponse middleware will automatically encrypt this if a public key is available
        res.status(201).json({
            status: true,
            message: 'Registration successful! Welcome to Konnect.',
            data: {
                recoveryKey: credential.recoveryKey,
                privateKey: credential.privateKey,
                id: newAdmin._id.toString()
            },
            // Include public key in response so resolvePublicKey middleware can use it
            publicKey: clientPublicKey
        });

    } catch (error) {
        console.error('Error in admin registration:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred during registration. Please try again.'
        });
    }
};

// OTP sending controller
export const sendRegistrationOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { emailId } = req.body;

        // Validate email input
        if (!emailId) {
            res.status(400).json({
                status: false,
                message: 'Email address is required.'
            });
            return;
        }

        // Check if email already exists
        const existingAdmin = await AdminModel.findOne({ email_id: emailId });
        if (existingAdmin) {
            res.status(409).json({
                status: false,
                message: 'Email address is already registered.'
            });
            return;
        }

        // Send OTP email
        const otpResult = await sendOTPEmail(emailId, "OTP for Registration at Konnect");

        if (!otpResult.status) {
            res.status(500).json({
                status: false,
                message: 'Failed to send OTP. Please try again later.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'OTP sent successfully. Please check your email.'
        });

    } catch (error) {
        console.error('Error sending registration OTP:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred. Please try again later.'
        });
    }
};

// Admin Login Controller
export const adminLoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const loginData: AdminLoginData = req.body;
        
        // Client's public key (if provided) is stored by decryptRequest middleware
        const clientPublicKey = (req as any).clientPublicKey;

        // Validate input
        if (!loginData.collegeCode || !loginData.username || !loginData.password) {
            res.status(400).json({
                status: false,
                message: 'College code, username and password are required.'
            });
            return;
        }

        // Find admin by college code
        const admin = await AdminModel.findOne({ 
            college_code: loginData.collegeCode,
        });
        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }
        // Check if username matches
        if (admin.username !== loginData.username) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Verify password
        const isPasswordValid = await verifyHash(loginData.password, admin.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid password.'
            });
            return;
        }

        // Set JWT token
        const jwtPayload = { type: 'admin', id: admin._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry
        
        // Decrypt private key from database
        const privateKey = decryptAES(admin.private_key, generateAESKeyFromString(loginData.password));
        
        // Return success response with sensitive data
        // The encryptResponse middleware will automatically encrypt this if a public key is available
        res.status(200).json({
            status: true,
            message: 'Login successful!',
            data: {
                id: admin._id.toString(),
                privateKey: privateKey
            },
            // Include public key in response so resolvePublicKey middleware can use it
            publicKey: clientPublicKey
        });
    } catch (error) {
        console.error('Error in admin login:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};
// Admin Logout Controller
export const adminLogoutController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Clear the auth_token cookie
        res.clearCookie('auth_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });
        res.status(200).json({
            status: true,
            message: 'Logged out successfully.'
        });
    } catch (error) {
        console.error('Error during admin logout:', error);
        res.status(500).json({
            status: false,
            message: 'An error occurred during logout.'
        });
    }
};

export const sendAdminProfilePicture = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params; // Get admin ID from URL parameters
        if (!adminId) {
            res.status(400).json({
                status: false,
                message: 'Admin ID is required.'
            });
            return;
        }

        const admin = await AdminModel.findById(adminId);
        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Send profile picture URL or null if not set
        res.status(200).json({
            status: true,
            profilePicture: admin.profile_picture
        });
    } catch (error) {
        console.error('Error fetching admin profile picture:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching profile picture.'
        });
    }
};

/**
 * Get admin public details (username, email, college code)
 * No authentication required as this is public data
 */
export const getAdminDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params;

        // Find admin by ID and select only public fields
        const admin = await AdminModel.findById(adminId).select('username email_id college_code');

        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Decrypt the email since it's stored encrypted
        const decryptedEmail = decryptAES(admin.email_id, internalAesKey);

        res.status(200).json({
            status: true,
            message: 'Admin details retrieved successfully.',
            data: {
                username: admin.username,
                email: decryptedEmail,
                collegeCode: admin.college_code
            }
        });

    } catch (error) {
        console.error('Error fetching admin details:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching admin details.'
        });
    }
};

/**
 * Get admin details from JWT token
 * Requires authentication
 */
export const getAdminDetailsFromJWT = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ 
                status: false, 
                message: 'User not authenticated' 
            });
            return;
        }

        // Find admin by ID from JWT token and select only public fields
        const admin = await AdminModel.findById(req.user.id).select('username email_id college_code');

        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Decrypt the email since it's stored encrypted
        const decryptedEmail = decryptAES(admin.email_id, internalAesKey);

        res.status(200).json({
            status: true,
            message: 'Admin details retrieved successfully.',
            data: {
                userId: req.user.id,
                username: admin.username,
                email: decryptedEmail,
                collegeCode: admin.college_code
            }
        });

    } catch (error) {
        console.error('Error fetching admin details from JWT:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching admin details.'
        });
    }
};
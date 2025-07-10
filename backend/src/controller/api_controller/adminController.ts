import { Request, Response } from 'express';
import { OTP } from '../../utils/otp';
import { ADMIN_REGISTRATION_RULES as validationRules } from '../../constants/rules';
import { createHash } from '../../encryption/hash_utils';
import { decryptRSA, encryptRSA, generateRSAKeyPair } from '../../encryption/RSA_utils';
import { encryptAES, generateAESKeyFromString, decryptAES } from '../../encryption/AES_utils';
import { sendOTPEmail } from '../../utils/mailer';
import AdminModel from '../../models/admin.model';
import type { AdminDocument } from '../../models/admin.model';
import { internalAesKey } from '../../constants/keys';
import { KeyManager } from '../../encryption/keyManager';
import { setJwtCookie } from '../../jwtManager/jwt_utils';

// Types
type AdminRegistrationData = {
    collegeName: string;
    adminUsername: string;
    collegeCode: string;
    emailId: string;
    password: string;
    otp: string;
};

type EncryptedRegistrationData = {
    key: string;
    keyId: string;
    collegeName: string;
    adminUsername: string;
    collegeCode: string;
    emailId: string;
    password: string;
    otp: string;
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

// Helper function to decrypt registration data
const decryptRegistrationData = (encryptedData: EncryptedRegistrationData, userKey: string): AdminRegistrationData => {
    // Decrypt the AES key using RSA private key
    const userAESKey = decryptRSA(encryptedData.key, userKey);
    
    // Decrypt all registration fields using the AES key
    return {
        collegeName: decryptAES(encryptedData.collegeName, userAESKey),
        adminUsername: decryptAES(encryptedData.adminUsername, userAESKey),
        collegeCode: decryptAES(encryptedData.collegeCode, userAESKey),
        emailId: decryptAES(encryptedData.emailId, userAESKey),
        password: decryptAES(encryptedData.password, userAESKey),
        otp: decryptAES(encryptedData.otp, userAESKey),
    };
};

// Helper function to check for existing admin
const checkExistingAdmin = async (data: AdminRegistrationData): Promise<{ exists: boolean; message?: string }> => {
    const existingAdmin = await AdminModel.findOne({ 
        $or: [
            { college_code: data.collegeCode }, 
            { username: data.adminUsername },
            { email_id: data.emailId }
        ]
    });
    
    if (existingAdmin) {
        let message = 'Registration failed. ';
        if (existingAdmin.college_code === data.collegeCode) {
            message += 'College code is already in use.';
        } else if (existingAdmin.username === data.adminUsername) {
            message += 'Username is already taken.';
        } else if (existingAdmin.email_id === data.emailId) {
            message += 'Email address is already registered.';
        }
        return { exists: true, message };
    }
    
    return { exists: false };
};

// Helper function to create admin document
const createAdminDocument = async (data: AdminRegistrationData): Promise<AdminDocument> => {
    // Hash password
    const passwordHash = await createHash(data.password);

    // Create recovery password (user's password encrypted with RSA)
    const [recoveryKey, recoveryPublicKey] = generateRSAKeyPair();
    const recoveryPassword = encryptRSA(data.password, recoveryPublicKey);

    // Generate user's RSA key pair
    const [privateKey, publicKey] = generateRSAKeyPair();

    // Create encrypted document
    return {
        college_code: encryptAES(data.collegeCode, internalAesKey),
        college_name: encryptAES(data.collegeName, internalAesKey),
        username: encryptAES(data.adminUsername, internalAesKey),
        email_id: encryptAES(data.emailId, internalAesKey),
        password_hash: passwordHash,
        recovery_password: recoveryPassword,
        private_key: encryptAES(privateKey, generateAESKeyFromString(data.password)),
        public_key: encryptAES(publicKey, internalAesKey)
    };
};

// Main registration controller
export const registerController = async (req: Request, res: Response): Promise<void> => {
    try {
        const encryptedData: EncryptedRegistrationData = req.body;

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

        // Decrypt registration data
        const data = decryptRegistrationData(encryptedData, userKey);

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
        const adminDocument = await createAdminDocument(data);
        const newAdmin = new AdminModel(adminDocument);
        await newAdmin.save();

        // Set JWT token for authentication
        const jwtPayload = {
            type: "admin",
            id: newAdmin._id.toString()
        };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Return success response
        res.status(201).json({
            status: true, 
            message: 'Registration successful! Welcome to Konnect.'
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
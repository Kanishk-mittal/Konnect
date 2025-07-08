import { Request, Response } from 'express';
import { OTP } from '../../utils/otp';
import { ADMIN_REGISTRATION_RULES as validationRules } from '../../constants/rules';
import bcrypt from 'bcrypt';
import AdminModel from '../../models/admin.model';
import { generateRSAKeyPair } from '../../encryption/RSA_utils';
import { sendOTPEmail } from '../../utils/mailer';

type AdminRegistrationData = {
    collegeName: string;
    collegeCode: string;
    emailId: string;
    adminUsername: string;
    password: string;
}

const validateRegistrationData = (data: AdminRegistrationData): {status:boolean,message:string} => {
    // Validate the incoming data
    if (!data.collegeName || !data.collegeCode || !data.emailId || !data.adminUsername || !data.password) {
        return {status: false, message: 'All fields are required.'};
    }

    // Loop through each field and validate against its respective rule
    for (const [field, value] of Object.entries(data)) {
        const rule = validationRules[field];
        if (!rule) continue; // Skip if no rule defined for this field
        
        // Check minimum length if specified
        if (rule.minLength && value.length < rule.minLength) {
            return {
                status: false, 
                message: field === 'password' 
                    ? `Password must be at least ${rule.minLength} characters long.`
                    : `${field} must be at least ${rule.minLength} characters long.`
            };
        }
        
        // Check exact length if min and max are the same
        if (rule.minLength && rule.maxLength && rule.minLength === rule.maxLength && value.length !== rule.minLength) {
            return {
                status: false, 
                message: `${field} must be exactly ${rule.minLength} characters long.`
            };
        }
        
        // Check maximum length if specified
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
    
    // All validations passed
    return {status: true, message: 'Validation successful'};
}

export const registerController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Extract registration data from request body
        const data: AdminRegistrationData = req.body;
        console.log('Received registration data:', data);

        // Validate the registration data
        const validationResult = validateRegistrationData(data);
        if (!validationResult.status) {
            res.status(400).json({status: false, message: validationResult.message});
            return;
        }

        // Verify OTP
        const otp = req.body.otp;
        if (!otp || !OTP.verifyOTP(data.emailId, otp)) {
            res.status(401).json({status: false, message: 'Invalid or expired OTP.'});
            return;
        }

        // Check if college code or username already exists
        const existingAdmin = await AdminModel.findOne({ 
            $or: [
                { _college_code: data.collegeCode }, 
                { username: data.adminUsername },
                { email_id: data.emailId }
            ]
        });
        
        if (existingAdmin) {
            let message = 'Registration failed. ';
            if (existingAdmin._college_code === data.collegeCode) {
                message += 'College code is already in use.';
            } else if (existingAdmin.username === data.adminUsername) {
                message += 'Username is already taken.';
            } else if (existingAdmin.email_id === data.emailId) {
                message += 'Email address is already registered.';
            }
            
            res.status(409).json({status: false, message});
            return;
        }
        // TODO: encrpypt stuff here

        // Generate RSA key pair for encryption
        const [privateKey, publicKey] = generateRSAKeyPair();

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(data.password, saltRounds);

        // Create a recovery key (could be used for password reset)
        const recoveryKey = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);

        // Create and save new admin
        const newAdmin = new AdminModel({
            _college_code: data.collegeCode,
            college_name: data.collegeName,
            username: data.adminUsername,
            email_id: data.emailId,
            password_hash: passwordHash,
            recovery: recoveryKey,
            private_key: privateKey,
            public_key: publicKey
        });

        await newAdmin.save();

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

export const sendRegistrationOTP = async (req: Request, res: Response): Promise<void> => {
    try {
        const { emailId } = req.body;
        
        if (!emailId) {
            res.status(400).json({
                status: false,
                message: 'Email address is required.'
            });
            return;
        }
        
        // Check if email already exists in database
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
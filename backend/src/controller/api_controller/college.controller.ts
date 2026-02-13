import { Request, Response } from 'express';
import { OTP } from '../../utils/otp.utils';
import { sendOTPEmail } from '../../utils/mailer.utils';
import UserModel from '../../models/user.model';
import { CollegeRegistrationData, validateCollegeRegistrationData } from '../../inputSchema/college.schema';
import { createRootAdmin } from '../../services/admin.services';
import { isCollegeCodeAvailable, addNewCollege } from '../../services/collge.services';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';

// OTP sending controller
export const sendConfirmationOTP = async (req: Request, res: Response): Promise<void> => {
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
        // checking in UserModel since emails are unique for users (used as id)
        const existingUser = await UserModel.findOne({ email_id: emailId });
        if (existingUser) {
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

// Main registration controller for college
export const registerCollegeController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const data: CollegeRegistrationData = req.body;

        // Client's public key (if provided) is stored by decryptRequest middleware
        const clientPublicKey = (req as any).clientPublicKey;

        // 1. Validate registration data
        const validationResult = validateCollegeRegistrationData(data);
        if (!validationResult.status) {
            res.status(400).json({
                status: false,
                message: validationResult.message
            });
            return;
        }

        // 2. Verify OTP
        if (!data.otp || !OTP.verifyOTP(data.emailId, data.otp)) {
            res.status(401).json({
                status: false,
                message: 'Invalid or expired OTP.'
            });
            return;
        }

        // 3. Check for college code uniqueness
        const codeAvailable = await isCollegeCodeAvailable(data.collegeCode);
        if (!codeAvailable) {
            res.status(409).json({
                status: false,
                message: 'College code already exists. Please choose a different code.'
            });
            return;
        }

        // 4. Create a new college
        const collegeResult = await addNewCollege(data.collegeCode, data.collegeName);
        if (!collegeResult.success || !collegeResult.college) {
            res.status(500).json({
                status: false,
                message: collegeResult.message || 'Failed to create college.'
            });
            return;
        }

        // 5. Create a new root admin for that college
        const adminResp = await createRootAdmin({
            adminUsername: data.adminUsername,
            collegeCode: data.collegeCode,
            emailId: data.emailId,
            password: data.password
        });

        if (!adminResp.status || !adminResp.user) {
            res.status(500).json({
                status: false,
                message: adminResp.message
            });
            return;
        }

        // 6. Set JWT token for authentication
        const jwtPayload = {
            type: "admin",
            id: adminResp.user._id.toString()
        };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // 7. Return success response with sensitive data
        res.status(201).json({
            status: true,
            message: 'Registration successful! Welcome to Konnect.',
            data: {
                recoveryKey: adminResp.rawKeys?.recoveryKey,
                privateKey: adminResp.rawKeys?.privateKey,
                id: adminResp.user._id.toString()
            },
            // Include public key in response so resolvePublicKey middleware can use it
            publicKey: clientPublicKey
        });

    } catch (error) {
        console.error('Error in college registration:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred during registration. Please try again.'
        });
    }
};

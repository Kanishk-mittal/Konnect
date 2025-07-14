import { Request, Response } from 'express';
import { sendOTPEmail as sendOTP } from "../../utils/mailer.utils";

export const sendOTPEmail = async (req: Request, res: Response) => { 
    const email: string = req.body.emailID;
    
    if (!email) {
        return res.status(400).json({
            status: false,
            message: 'Email is required'
        });
    }
    
    try {
        // Call the utility function to send OTP email
        const result = await sendOTP(email, 'OTP Verification');
        
        if (result.status) {
            return res.status(200).json({
                status: true,
                message: 'OTP sent successfully'
            });
        } else {
            return res.status(500).json({
                status: false,
                message: 'Failed to send OTP'
            });
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        return res.status(500).json({
            status: false,
            message: 'An error occurred while sending OTP'
        });
    }
}
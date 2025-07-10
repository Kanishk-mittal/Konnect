import nodemailer, { SentMessageInfo } from 'nodemailer';
import { OTP } from './otp';

// Create nodemailer transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});



/**
 * Sends an email to the specified receiver
 * @param title - The subject of the email
 * @param message - The body content of the email
 * @param receiver - The recipient email address
 * @returns A promise that resolves with info about the sent email or rejects with an error
 */
export const sendEmail = async (
  title: string, 
  message: string, 
  receiver: string
): Promise<SentMessageInfo> => {
  try {
    const mailOptions = {
      from: process.env.MAIL_FROM || 'Konnect <no-reply@konnect.com>',
      to: receiver,
      subject: title,
      html: message,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Sends an email with template to the specified receiver
 * @param title - The subject of the email
 * @param message - The body content of the email
 * @param receiver - The recipient email address
 * @returns A promise that resolves with info about the sent email or rejects with an error
 */
export const sendTemplatedEmail = async (
  title: string, 
  message: string, 
  receiver: string
): Promise<void> => {
  // Create HTML template with Konnect branding
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
        }
        .header {
          background-color: #4a7aff;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          border: 1px solid #ddd;
          border-top: none;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Konnect</h2>
      </div>
      <div class="content">
        ${message}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Konnect. All rights reserved.</p>
        <p>Please do not reply to this email as it was sent from an unmonitored address.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail(title, htmlContent, receiver);
};

/**
 * Interface for OTP email response
 */
interface OTPEmailResponse {
  status: boolean;
  otp: string;
}

/**
 * Sends an email with an OTP to the specified receiver
 * @param email - The recipient email address
 * @param subject - Optional custom subject line (defaults to "Your OTP Code")
 * @returns A promise that resolves with the OTP sent and a status boolean
 */
export const sendOTPEmail = async (
  email: string,
  subject: string = "Your OTP Code"
): Promise<OTPEmailResponse> => {
  try {
    // Generate a new OTP
    const otp = OTP.generateOTP(email);
    
    // Create the email content
    const message = `
      <h2>Your One-Time Password</h2>
      <p>Please use the following OTP to complete your verification:</p>
      <div style="margin: 20px auto; width: 200px; padding: 15px; background-color: #f4f4f4; border: 1px solid #ddd; border-radius: 5px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
        ${otp}
      </div>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
    `;

    // debug log
    console.log(process.env.MAIL_USER, process.env.MAIL_PASSWORD);
    
    // Send the templated email with the OTP
    await sendTemplatedEmail(subject, message, email);
    
    // Return success status and the OTP
    return {
      status: true,
      otp
    };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    
    // Return failure status and empty OTP
    return {
      status: false,
      otp: ''
    };
  }
};

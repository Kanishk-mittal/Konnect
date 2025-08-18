import nodemailer, { SentMessageInfo } from 'nodemailer';
import { OTP } from './otp.utils';

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

/**
 * Sends credentials email to a single student
 * @param studentEmail - Student's email address
 * @param studentName - Student's display name
 * @param collegeCode - College code
 * @param rollNumber - Student's roll number
 * @param password - Generated password
 * @returns Promise that resolves when email is sent
 */
export const sendStudentCredentialsEmail = async (
  studentEmail: string,
  studentName: string,
  collegeCode: string,
  rollNumber: string,
  password: string
): Promise<void> => {
  const subject = 'Welcome to Konnect - Your Account Credentials';
  
  const message = `
    <h2>Welcome to Konnect!</h2>
    <p>Dear ${studentName},</p>
    <p>Your student account has been successfully created and activated. Here are your login credentials:</p>
    
    <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #4a7aff;">
      <h3>Your Login Credentials:</h3>
      <p><strong>College Code:</strong> ${collegeCode}</p>
      <p><strong>Roll Number:</strong> ${rollNumber}</p>
      <p><strong>Temporary Password:</strong> <code style="background-color: #e0e0e0; padding: 2px 5px; border-radius: 3px;">${password}</code></p>
    </div>
    
    <div style="background-color: #d4edda; padding: 15px; margin: 20px 0; border: 1px solid #c3e6cb; border-radius: 5px;">
      <h4 style="color: #155724; margin: 0 0 10px 0;">✅ Account Status: Successfully Created</h4>
      <p style="color: #155724; margin: 0;">Your account is now active and ready to use. You can log in immediately using the credentials above.</p>
    </div>
    
    <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border: 1px solid #ffeaa7; border-radius: 5px;">
      <h4 style="color: #856404; margin: 0 0 10px 0;">⚠️ Important Security Instructions:</h4>
      <ul style="color: #856404; margin: 0;">
        <li><strong>Change your password immediately</strong> after your first login</li>
        <li><strong>Create recovery keys</strong> to secure your account</li>
        <li><strong>Keep your credentials safe</strong> and do not share them with anyone</li>
        <li><strong>Log in as soon as possible</strong> to secure your account</li>
      </ul>
    </div>
    
    <p>You can log in to Konnect using the credentials provided above. Make sure to follow the security instructions for the safety of your account.</p>
    
    <p>If you have any questions or need assistance, please contact your system administrator.</p>
    
    <p>Best regards,<br>The Konnect Team</p>
  `;

  await sendTemplatedEmail(subject, message, studentEmail);
};

/**
 * Sends credentials emails to multiple students in bulk
 * @param emailData - Array of student email data objects
 * @returns Promise that resolves when all emails are sent
 */
export const sendBulkStudentEmails = async (
  emailData: Array<{
    email: string;
    name: string;
    collegeCode: string;
    rollNumber: string;
    password: string;
  }>
): Promise<{ successful: number; failed: number; errors: string[] }> => {
  const emailPromises: Promise<void>[] = [];
  const errors: string[] = [];
  let successful = 0;
  let failed = 0;

  // Create array of email sending promises
  for (const student of emailData) {
    const emailPromise = sendStudentCredentialsEmail(
      student.email,
      student.name,
      student.collegeCode,
      student.rollNumber,
      student.password
    ).then(() => {
      successful++;
    }).catch((error) => {
      failed++;
      errors.push(`Failed to send email to ${student.email}: ${error.message}`);
    });

    emailPromises.push(emailPromise);
  }

  // Wait for all email promises to resolve
  await Promise.allSettled(emailPromises);

  return {
    successful,
    failed,
    errors
  };
};

import { Request, Response } from 'express';
import { createHash, verifyHash, generateRandomPassword } from '../../utils/encryption/hash.utils';
import { decryptRSA, encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { decryptAES, encryptAES, generateAESKey, generateAESKeyFromString } from '../../utils/encryption/aes.utils';
import studentModel from '../../models/Student.model';
import AdminModel from '../../models/admin.model';
import { KeyManager } from '../../utils/encryption/key-manager.utils';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';
import { sendStudentCredentialsEmail, sendBulkStudentEmails } from '../../utils/mailer.utils';
import { sendBulkStudentEmailsSmart } from '../../utils/emailProcessor.utils';
import { internalAesKey } from '../../constants/keys';
import mongoose from 'mongoose';

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

type StudentData = {
    name: string;
    roll: string;
    email: string;
};

type BulkStudentRegistrationRequest = {
    students: StudentData[];
};

// Validation functions
const validateStudentData = (students: StudentData[]): string[] => {
    const errors: string[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rollRegex = /^[A-Za-z0-9]{1,20}$/; // Alphanumeric, max 20 chars
    
    students.forEach((student, index) => {
        if (!student || typeof student !== 'object') {
            errors.push(`Student at index ${index} is invalid`);
            return;
        }
        
        // Name validation
        if (!student.name || typeof student.name !== 'string' || student.name.trim().length < 2) {
            errors.push(`Student at index ${index}: Name must be at least 2 characters`);
        } else if (student.name.trim().length > 100) {
            errors.push(`Student at index ${index}: Name must not exceed 100 characters`);
        }
        
        // Roll validation
        if (!student.roll || typeof student.roll !== 'string') {
            errors.push(`Student at index ${index}: Roll number is required`);
        } else if (!rollRegex.test(student.roll.trim())) {
            errors.push(`Student at index ${index}: Roll number must be alphanumeric (max 20 chars)`);
        }
        
        // Email validation
        if (!student.email || typeof student.email !== 'string') {
            errors.push(`Student at index ${index}: Email is required`);
        } else if (!emailRegex.test(student.email.trim())) {
            errors.push(`Student at index ${index}: Invalid email format`);
        }
    });
    
    return errors;
};

// Check for duplicates efficiently
const checkForDuplicates = async (students: StudentData[], collegeCode: string): Promise<string[]> => {
    const errors: string[] = [];
    
    // Extract unique rolls and emails for efficient querying
    const rolls = [...new Set(students.map(s => s.roll))];
    const emails = [...new Set(students.map(s => s.email))];
    
    // Check internal duplicates first
    const rollCounts = new Map();
    const emailCounts = new Map();
    
    students.forEach((student, index) => {
        const rollKey = student.roll;
        const emailKey = student.email;
        
        if (rollCounts.has(rollKey)) {
            errors.push(`Duplicate roll number '${rollKey}' found at indexes ${rollCounts.get(rollKey)} and ${index}`);
        } else {
            rollCounts.set(rollKey, index);
        }
        
        if (emailCounts.has(emailKey)) {
            errors.push(`Duplicate email '${emailKey}' found at indexes ${emailCounts.get(emailKey)} and ${index}`);
        } else {
            emailCounts.set(emailKey, index);
        }
    });
    
    if (errors.length > 0) return errors;
    
    // Check database duplicates in parallel
    const [existingRolls, existingEmails] = await Promise.all([
        studentModel.find({
            college_code: collegeCode,
            roll: { $in: rolls }
        }).select('roll').lean(),
        
        studentModel.find({
            email_id: { $in: emails }
        }).select('email_id').lean()
    ]);
    
    if (existingRolls.length > 0) {
        const duplicateRolls = existingRolls.map(s => s.roll);
        errors.push(`Roll numbers already exist in college: ${duplicateRolls.join(', ')}`);
    }
    
    if (existingEmails.length > 0) {
        const duplicateEmails = existingEmails.map(s => s.email_id);
        errors.push(`Email addresses already exist: ${duplicateEmails.join(', ')}`);
    }
    
    return errors;
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
        const student = await studentModel.findOne({ 
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
        const isPasswordValid = await verifyHash(loginData.password, student.password_hash as string);
        if (!isPasswordValid) {
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

/**
 * Get student details by college code
 * Returns roll number, display name, and profile picture for all students with the given college code
 */
export const getStudentByCollegeCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { collegeCode } = req.params;

        // Validate college code parameter
        if (!collegeCode) {
            res.status(400).json({
                status: false,
                message: 'College code is required.'
            });
            return;
        }

        // Find all students by college code and select only required fields
        const students = await studentModel.find({ 
            college_code: collegeCode 
        }).select('_id roll display_name profile_picture');

        // Map students to the desired format
        const studentData = students.map(student => ({
            id: student._id.toString(),
            rollNumber: student.roll,
            name: student.display_name,
            profilePicture: student.profile_picture || null // Return null if empty, frontend will handle
        }));

        // Return student details (empty array if no students found)
        res.status(200).json({
            status: true,
            message: studentData.length > 0 
                ? 'Student details retrieved successfully.' 
                : 'No students found with the provided college code.',
            data: studentData
        });

    } catch (error) {
        console.error('Error fetching students by college code:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching student details.'
        });
    }
};

/**
 * Helper function to create multiple student documents in parallel
 * @param students - Array of student data
 * @param collegeCode - College code from admin
 * @returns Promise with array of student documents and passwords
 */
const createStudentDocumentsParallel = async (
    students: StudentData[], 
    collegeCode: string
): Promise<Array<{ studentDoc: any; password: string; email: string; name: string; roll: string }>> => {
    // Process all students in parallel for much better performance
    const studentPromises = students.map(async (studentData) => {
        // Generate random password
        const password = generateRandomPassword(12);
        
        // Hash the password
        const passwordHash = await createHash(password);
        
        // Generate RSA key pair for the student
        const [privateKey, publicKey] = generateRSAKeyPair();
        
        // Encrypt private key with user's password
        const encryptedPrivateKey = encryptAES(privateKey, generateAESKeyFromString(password));
        
        // Encrypt public key with server's internal key
        const encryptedPublicKey = encryptAES(publicKey, internalAesKey);
        
        // Create student document
        const studentDoc = {
            profile_picture: null,
            roll: studentData.roll,
            display_name: studentData.name,
            college_code: collegeCode,
            email_id: studentData.email,
            password_hash: passwordHash,
            fullname: studentData.name,
            recovery: '', // Empty string as specified
            private_key: encryptedPrivateKey,
            public_key: encryptedPublicKey,
            blocked_user: [] // Empty array as specified
        };
        
        return { 
            studentDoc, 
            password, 
            email: studentData.email, 
            name: studentData.name, 
            roll: studentData.roll 
        };
    });
    
    // Wait for all student documents to be created in parallel
    return await Promise.all(studentPromises);
};

/**
 * Bulk student registration controller with transaction support and parallel processing
 * Accepts a list of student objects and creates accounts for all of them
 */
export const bulkStudentRegistration = async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    
    try {
        const { students }: BulkStudentRegistrationRequest = req.body;
        
        // Validate input
        if (!students || !Array.isArray(students) || students.length === 0) {
            res.status(400).json({
                status: false,
                message: 'Students array is required and must contain at least one student.'
            });
            return;
        }
        
        // Validate each student object
        const validationErrors = validateStudentData(students);
        if (validationErrors.length > 0) {
            res.status(400).json({
                status: false,
                message: 'Validation failed',
                errors: validationErrors
            });
            return;
        }
        
        // Get admin ID from JWT token (set by auth middleware)
        const adminId = req.user?.id;
        if (!adminId) {
            res.status(401).json({
                status: false,
                message: 'Admin authentication required.'
            });
            return;
        }
        
        // Get admin's college code from database
        const admin = await AdminModel.findById(adminId);
        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }
        
        const collegeCode = admin.college_code; // college_code is stored unencrypted
        
        // Check for duplicates
        const duplicateErrors = await checkForDuplicates(students, collegeCode);
        if (duplicateErrors.length > 0) {
            res.status(400).json({
                status: false,
                message: 'Duplicate entries found',
                errors: duplicateErrors
            });
            return;
        }
        
        // Use transaction for all database operations
        const result = await session.withTransaction(async () => {
            console.log(`Starting parallel processing of ${students.length} students...`);
            
            // Create all student documents in parallel (MUCH FASTER)
            const processedStudents = await createStudentDocumentsParallel(students, collegeCode);
            const studentDocuments = processedStudents.map(p => p.studentDoc);
            
            console.log(`Parallel processing completed. Inserting ${studentDocuments.length} students to database...`);
            
            // Bulk insert students into database within transaction
            const insertedStudents = await studentModel.insertMany(studentDocuments, { session });
            
            console.log(`Successfully inserted ${insertedStudents.length} students to database.`);
            
            // Prepare email data for successfully inserted students
            const emailData = insertedStudents.map((student, index) => {
                const processedStudent = processedStudents[index];
                if (!processedStudent) {
                    throw new Error(`Missing processed student data at index ${index}`);
                }
                
                return {
                    email: processedStudent.email,
                    name: processedStudent.name,
                    collegeCode: collegeCode,
                    rollNumber: student.roll as string,
                    password: processedStudent.password
                };
            });
            
            return {
                insertedStudents,
                emailData
            };
        });
        
        console.log(`Transaction completed successfully. Sending emails to ${result.emailData.length} students...`);
        
        // Send emails in parallel after successful database transaction
        let emailResults;
        try {
            emailResults = await sendBulkStudentEmailsSmart(result.emailData);
            console.log(`Email sending completed. Sent: ${emailResults.successful}, Failed: ${emailResults.failed}`);
        } catch (emailError) {
            console.error('Error sending emails (but students were registered successfully):', emailError);
            emailResults = {
                successful: 0,
                failed: result.emailData.length,
                errors: [`Failed to send emails: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`]
            };
        }
        
        // Prepare response
        const response = {
            status: true,
            message: `Successfully registered ${result.insertedStudents.length} students`,
            data: {
                studentsRegistered: result.insertedStudents.length,
                emailsSent: emailResults.successful,
                emailsFailed: emailResults.failed,
                ...(emailResults.errors.length > 0 && { emailErrors: emailResults.errors })
            }
        };
        
        res.status(201).json(response);
        
    } catch (error) {
        console.error('Error in bulk student registration:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred during student registration.',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        await session.endSession();
    }
};

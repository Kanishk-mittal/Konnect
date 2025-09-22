import { Request, Response } from 'express';

// Models
import studentModel from '../../models/Student.model';
import AdminModel from '../../models/admin.model';

// Utils - Encryption
import { generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import { encryptAES, generateAESKeyFromString } from '../../utils/encryption/aes.utils';
import { verifyHash, createHash } from '../../utils/encryption/hash.utils';

// Utils - Other
import { setJwtCookie } from '../../utils/jwt/jwt.utils';
import { sendStudentCredentialsEmail, sendBulkStudentEmails } from '../../utils/mailer.utils';
import { sendBulkStudentEmailsSmart } from '../../utils/emailProcessor.utils';

// Constants
import { internalAesKey } from '../../constants/keys';

// Types
type StudentData = {
    name: string;
    roll: string;
    email: string;
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
        // Data is already decrypted by middleware
        const { collegeCode, rollNumber, password, publicKey } = req.body;

        // Validate input
        if (!collegeCode || !rollNumber || !password) {
            res.status(400).json({
                status: false,
                error: 'Missing required fields',
                message: 'College code, roll number, and password are required.'
            });
            return;
        }

        // Find student by college code and roll
        const student = await studentModel.findOne({
            college_code: collegeCode,
            roll: rollNumber
        });

        if (!student) {
            res.status(404).json({
                status: false,
                error: 'Student not found',
                message: 'No student found with the provided college code and roll number'
            });
            return;
        }

        // Verify password
        const isPasswordValid = await verifyHash(password, student.password_hash as string);
        if (!isPasswordValid) {
            res.status(401).json({
                status: false,
                error: 'Invalid password',
                message: 'The provided password is incorrect'
            });
            return;
        }

        // Set JWT token
        const jwtPayload = { type: 'student', id: student._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Store publicKey for middleware and prepare response data
        if (publicKey) {
            (res as any).encryptionPublicKey = publicKey;

            // Return student credentials - middleware will handle encryption
            res.status(200).json({
                privateKey: student.private_key as string,
                studentId: student._id.toString()
            });
        } else {
            // Standard response if no public key was provided
            res.status(200).json({
                status: true,
                message: 'Login successful!'
            });
        }
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

        // Find all students by college code and select required fields including is_blocked
        const students = await studentModel.find({
            college_code: collegeCode
        }).select('_id roll display_name profile_picture is_blocked');

        // Map students to the desired format
        const studentData = students.map(student => ({
            id: student._id.toString(),
            rollNumber: student.roll,
            name: student.display_name,
            profilePicture: student.profile_picture || null, // Return null if empty, frontend will handle
            isBlocked: student.is_blocked === true // Ensure boolean
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
 * Get blocked student details by college code
 * Returns roll number, display name, and profile picture for all blocked students in the given college
 */
export const getBlockedStudentsByCollegeCode = async (req: Request, res: Response): Promise<void> => {
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

        // Find all blocked students by college code
        const blockedStudents = await studentModel.find({
            college_code: collegeCode,
            is_blocked: true
        }).select('_id roll display_name profile_picture is_blocked');

        // Map students to the desired format (same format as getStudentByCollegeCode)
        const studentData = blockedStudents.map(student => ({
            id: student._id.toString(),
            rollNumber: student.roll,
            name: student.display_name,
            profilePicture: student.profile_picture || null,
            isBlocked: student.is_blocked === true // Will always be true for this endpoint
        }));

        // Return blocked student details
        res.status(200).json({
            status: true,
            message: studentData.length > 0
                ? 'Blocked student details retrieved successfully.'
                : 'No blocked students found with the provided college code.',
            data: studentData
        });

    } catch (error) {
        console.error('Error fetching blocked students by college code:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching blocked student details.'
        });
    }
};

/**
 * Toggle a student's blocked status
 * @param req Request with studentId in body
 * @param res Response with success/failure message
 */
export const toggleStudentBlockStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId } = req.body;

        // Validate student ID
        if (!studentId) {
            res.status(400).json({
                status: false,
                message: 'Student ID is required.'
            });
            return;
        }

        // Find student by ID
        const student = await studentModel.findById(studentId);
        if (!student) {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        // Toggle the blocked status
        const newBlockedStatus = !student.is_blocked;
        student.is_blocked = newBlockedStatus;
        await student.save();

        res.status(200).json({
            status: true,
            message: `Student ${newBlockedStatus ? 'blocked' : 'unblocked'} successfully.`,
            data: {
                id: student._id.toString(),
                isBlocked: newBlockedStatus
            }
        });
    } catch (error) {
        console.error('Error toggling student block status:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while updating student block status.'
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
        // Generate random 8-character password
        const password = generateRandomPassword();

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

// Split students into batches of given size
const splitIntoBatches = (students: StudentData[], batchSize: number): StudentData[][] => {
    const batches: StudentData[][] = [];
    for (let i = 0; i < students.length; i += batchSize) {
        batches.push(students.slice(i, i + batchSize));
    }
    return batches;
};

// Generate random 8-character password
const generateRandomPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// ...previous batch-processing helper removed per request. The controller
// will now simply decrypt and display the whole payload for inspection.

/**
 * Bulk student registration controller - Currently only decrypts and displays data
 * for testing encryption/decryption flow
 */
export const bulkStudentRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
        // Data is already decrypted by middleware
        const { students } = req.body;

        // Validate payload structure
        if (!students || !Array.isArray(students)) {
            res.status(400).json({
                status: false,
                error: 'Invalid data format',
                message: 'Students array is required'
            });
            return;
        }

        // Map to expected format
        const studentsArray: StudentData[] = students.map((s: any) => ({
            name: s.name,
            roll: s.roll,
            email: s.email
        }));

        // Use existing validation function for content checks
        const validationErrors = validateStudentData(studentsArray);
        if (validationErrors.length > 0) {
            res.status(400).json({
                status: false,
                message: 'Validation failed for one or more students.',
                errors: validationErrors
            });
            return;
        }

        // Retrieve admin college code from authenticated user to check DB duplicates
        const adminId = (req as any).user?.id;
        if (!adminId) {
            res.status(401).json({ status: false, message: 'Admin authentication required.' });
            return;
        }

        let collegeCode: string;
        try {
            const admin = await AdminModel.findById(adminId);
            if (!admin) {
                res.status(404).json({ status: false, message: 'Admin not found.' });
                return;
            }
            collegeCode = admin.college_code;
        } catch (e) {
            console.error('Error fetching admin for duplicate check:', e);
            res.status(500).json({ status: false, message: 'Failed to validate admin.' });
            return;
        }

        // Check for duplicates using existing function
        try {
            const duplicateErrors = await checkForDuplicates(studentsArray, collegeCode);
            if (duplicateErrors.length > 0) {
                res.status(400).json({ status: false, message: 'Duplicate entries found', errors: duplicateErrors });
                return;
            }
        } catch (e) {
            console.error('Error during duplicate check:', e);
            res.status(500).json({ status: false, message: 'Error while checking duplicates.' });
            return;
        }

        // All validations passed — process students in batches
        const BATCH_SIZE = 100;
        const batches = splitIntoBatches(studentsArray, BATCH_SIZE);
        const allInserted: any[] = [];

        try {
            for (let b = 0; b < batches.length; b++) {
                const batch = batches[b]!; // non-null assertion: batches created from students array

                // 1) Prepare documents for this batch
                const prepared = await createStudentDocumentsParallel(batch, collegeCode);

                // Extract raw student documents for DB insertion
                const docsToInsert = prepared.map(p => p.studentDoc);

                // 2) Insert this batch into DB
                let inserted: any[] = [];
                try {
                    inserted = await studentModel.insertMany(docsToInsert, { ordered: false });
                    allInserted.push(...inserted);
                } catch (insertErr) {
                    // insertMany may throw for duplicates or other errors; capture inserted docs if any
                    console.error(`Error inserting batch ${b}:`, insertErr);

                    if ((insertErr as any).insertedDocs && Array.isArray((insertErr as any).insertedDocs)) {
                        inserted = (insertErr as any).insertedDocs;
                        allInserted.push(...inserted);
                    }
                    // Continue to sending emails for successfully inserted docs in this batch
                }

                // 3) Send credential emails for this batch in parallel for those that were inserted
                try {
                    const emailPromises = prepared
                        .filter(p => inserted.find(i => i.roll === p.roll || i.email_id === p.email))
                        .map(p => sendStudentCredentialsEmail(
                            p.email,
                            p.name,
                            collegeCode,
                            p.roll,
                            p.password
                        ).then(() => ({ email: p.email, status: 'sent' })).catch(err => ({ email: p.email, status: 'failed', error: err instanceof Error ? err.message : String(err) })));

                    const emailResults = await Promise.allSettled(emailPromises);
                } catch (emailErr) {
                    console.error(`Error sending emails for batch ${b}:`, emailErr);
                    // Continue to next batch despite email errors
                }
            }

            // After all batches processed, return summary
            res.status(200).json({
                status: true,
                message: `Bulk registration completed. Registered: ${allInserted.length} students`,
                registered: allInserted.length,
                failed: studentsArray.length - allInserted.length,
                details: {
                    successful: allInserted.map(student => ({
                        name: student.name,
                        collegeCode: student.college_code,
                        email: student.email_id
                    })),
                    failed: [] // Could be enhanced to track failed registrations
                }
            });
        } catch (e) {
            console.error('Error processing batches:', e);
            res.status(500).json({
                status: false,
                message: 'Failed while processing student batches.',
                error: e instanceof Error ? e.message : String(e)
            });
        }
    } catch (error) {
        console.error('Error in bulk student registration:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};


export const blockStudent = async (req: Request, res: Response): Promise<void> => {

}

/**
 * Delete a student by ID - Can only be accessed by an admin
 * @param req - Express request object with studentId in body
 * @param res - Express response object
 */
export const deleteStudent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId } = req.body;

        // Validate student ID
        if (!studentId) {
            res.status(400).json({
                status: false,
                message: 'Student ID is required.'
            });
            return;
        }

        // Get admin college code to ensure they only delete students from their college
        const adminId = (req as any).user?.id;
        const admin = await AdminModel.findById(adminId);
        if (!admin) {
            res.status(403).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Find the student to verify college code matches
        const student = await studentModel.findById(studentId);
        if (!student) {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        // Verify student belongs to admin's college
        if (student.college_code !== admin.college_code) {
            res.status(403).json({
                status: false,
                message: 'You do not have permission to delete students from other colleges.'
            });
            return;
        }

        // Delete the student
        await studentModel.findByIdAndDelete(studentId);

        // Return success response
        res.status(200).json({
            status: true,
            message: `Student ${student.display_name} (${student.roll}) has been successfully deleted.`
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while deleting the student.',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

/**
 * Delete multiple students by roll numbers - Can only be accessed by an admin
 * @param req - Express request object with collegeCode and rollNumbers in body
 * @param res - Express response object
 */
export const deleteMultipleStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        const { collegeCode, rollNumbers } = req.body;

        // Validate input
        if (!collegeCode || !rollNumbers || !Array.isArray(rollNumbers) || rollNumbers.length === 0) {
            res.status(400).json({
                status: false,
                message: 'College code and at least one roll number are required.'
            });
            return;
        }

        // Get admin college code to ensure they only delete students from their college
        const adminId = (req as any).user?.id;
        const admin = await AdminModel.findById(adminId);
        if (!admin) {
            res.status(403).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Verify the college code matches the admin's college code
        if (collegeCode !== admin.college_code) {
            res.status(403).json({
                status: false,
                message: 'You do not have permission to delete students from other colleges.'
            });
            return;
        }

        // Find all students matching the roll numbers in this college
        const students = await studentModel.find({
            college_code: collegeCode,
            roll: { $in: rollNumbers }
        }).select('_id roll display_name');

        if (students.length === 0) {
            res.status(404).json({
                status: false,
                message: 'No students found with the provided roll numbers.'
            });
            return;
        }

        // Extract student IDs for deletion
        const studentIds = students.map(student => student._id);

        // Delete all found students
        const deleteResult = await studentModel.deleteMany({
            _id: { $in: studentIds }
        });

        // Return success response with simplified information about removed students
        res.status(200).json({
            status: true,
            message: `Successfully removed ${deleteResult.deletedCount} student(s).`,
            removedCount: deleteResult.deletedCount,
            notFound: rollNumbers.filter(roll =>
                !students.some(student => student.roll === roll)
            )
        });
    } catch (error) {
        console.error('Error deleting students by roll:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while deleting students.',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
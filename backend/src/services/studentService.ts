import { generateRandomPassword, createHash } from '../utils/encryption/hash.utils';
import { generateRSAKeyPair } from '../utils/encryption/rsa.utils';
import { encryptAES, generateAESKeyFromString } from '../utils/encryption/aes.utils';
import { internalAesKey } from '../constants/keys';
import studentModel from '../models/Student.model';
import AdminModel from '../models/admin.model';
import userModel from '../models/user.model';
import { sendBulkStudentEmails } from '../utils/mailer.utils';

export interface StudentData {
    name: string;
    roll: string;
    email: string;
}

export interface BulkRegistrationResult {
    success: boolean;
    studentsRegistered: number;
    emailsSent: number;
    emailsFailed: number;
    errors: string[];
}

export class StudentService {

    /**
     * Create a single student document with all encryption
     */
    private static async createStudentDocument(
        studentData: StudentData,
        collegeCode: string
    ): Promise<{ studentDoc: any; password: string }> {
        const password = generateRandomPassword(12);
        const passwordHash = await createHash(password);
        const [privateKey, publicKey] = generateRSAKeyPair();

        return {
            studentDoc: {
                profile_picture: null,
                roll: studentData.roll,
                display_name: studentData.name,
                college_code: collegeCode,
                email_id: studentData.email,
                password_hash: passwordHash,
                fullname: studentData.name,
                recovery: '',
                private_key: encryptAES(privateKey, generateAESKeyFromString(password)),
                public_key: encryptAES(publicKey, internalAesKey),
                blocked_user: []
            },
            password
        };
    }

    /**
     * Validate student data batch
     */
    private static validateStudentsBatch(students: StudentData[]): string[] {
        const errors: string[] = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        students.forEach((student, index) => {
            if (!student?.name || !student?.roll || !student?.email) {
                errors.push(`Student at index ${index} missing required fields`);
            } else if (!emailRegex.test(student.email)) {
                errors.push(`Student at index ${index} has invalid email`);
            }
        });

        return errors;
    }

    /**
     * Check for duplicate students
     */
    private static async checkDuplicates(
        students: StudentData[],
        collegeCode: string
    ): Promise<string[]> {
        const errors: string[] = [];

        // Check duplicate rolls in same college
        const existingRolls = await userModel.find({
            college_code: collegeCode,
            id: { $in: students.map(s => s.roll) },
            user_type: 'student'
        }).select('id');

        if (existingRolls.length > 0) {
            errors.push(`Duplicate roll numbers: ${existingRolls.map(s => s.id).join(', ')}`);
        }

        // Check duplicate emails globally
        const existingEmails = await userModel.find({
            email_id: { $in: students.map(s => s.email) }
        }).select('email_id');

        if (existingEmails.length > 0) {
            errors.push(`Duplicate emails: ${existingEmails.map(s => s.email_id).join(', ')}`);
        }

        return errors;
    }

    /**
     * Main bulk registration method
     */
    public static async bulkRegisterStudents(
        students: StudentData[],
        adminId: string
    ): Promise<BulkRegistrationResult> {

        // Validation
        const validationErrors = this.validateStudentsBatch(students);
        if (validationErrors.length > 0) {
            return {
                success: false,
                studentsRegistered: 0,
                emailsSent: 0,
                emailsFailed: 0,
                errors: validationErrors
            };
        }

        // Get admin's college code
        const admin = await AdminModel.findById(adminId);
        if (!admin) {
            return {
                success: false,
                studentsRegistered: 0,
                emailsSent: 0,
                emailsFailed: 0,
                errors: ['Admin not found']
            };
        }

        const adminUser = await userModel.findById(admin.user_id);
        if (!adminUser) {
            return {
                success: false,
                studentsRegistered: 0,
                emailsSent: 0,
                emailsFailed: 0,
                errors: ['Admin user record not found']
            };
        }

        const collegeCode = adminUser.college_code;

        // Check duplicates
        const duplicateErrors = await this.checkDuplicates(students, collegeCode);
        if (duplicateErrors.length > 0) {
            return {
                success: false,
                studentsRegistered: 0,
                emailsSent: 0,
                emailsFailed: 0,
                errors: duplicateErrors
            };
        }

        // Process students in parallel
        const studentPromises = students.map(student =>
            this.createStudentDocument(student, collegeCode)
        );

        const processedStudents = await Promise.all(studentPromises);
        const studentDocuments = processedStudents.map(p => p.studentDoc);

        // Database insertion
        const insertedStudents = await studentModel.insertMany(studentDocuments);

        // Prepare email data
        const emailData = insertedStudents.map((student, index) => {
            const originalStudent = students[index];
            const processedStudent = processedStudents[index];

            if (!originalStudent || !processedStudent) {
                throw new Error(`Missing data for student at index ${index}`);
            }

            return {
                email: originalStudent.email,
                name: originalStudent.name,
                collegeCode: collegeCode,
                rollNumber: student.roll,
                password: processedStudent.password
            };
        });

        // Send emails
        const emailResults = await sendBulkStudentEmails(emailData);

        return {
            success: true,
            studentsRegistered: insertedStudents.length,
            emailsSent: emailResults.successful,
            emailsFailed: emailResults.failed,
            errors: emailResults.errors
        };
    }
}

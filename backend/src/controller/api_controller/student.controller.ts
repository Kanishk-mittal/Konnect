import { Request, Response } from 'express';

// Models
import StudentModel from '../../models/Student.model';
import AdminModel from '../../models/admin.model';
import userModel from '../../models/user.model';
import BlockedStudentModel from '../../models/blockedStudent.model';

// Utils - Encryption
import { verifyHash, createHash } from '../../utils/encryption/hash.utils';

// Utils - Other
import { setJwtCookie } from '../../utils/jwt/jwt.utils';
import * as StudentServices from "../../services/studentService";

// Constants
import { validateBlockStudentsData, validateUnblockStudentsData } from '../../inputSchema/student.schema';

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
        userModel.find({
            college_code: collegeCode,
            id: { $in: rolls },
            user_type: 'student'
        }).select('id').lean(),

        userModel.find({
            email_id: { $in: emails }
        }).select('email_id').lean()
    ]);

    if (existingRolls.length > 0) {
        const duplicateRolls = existingRolls.map(s => s.id);
        errors.push(`Roll numbers already exist in college: ${duplicateRolls.join(', ')}`);
    }

    if (existingEmails.length > 0) {
        const duplicateEmails = existingEmails.map(s => s.email_id);
        errors.push(`Email addresses already exist: ${duplicateEmails.join(', ')}`);
    }

    return errors;
};

// Student Login Controller - Removed
// Student Logout Controller - Removed

/**
 * Get student details by college code
 * Automatically determines college code from the authenticated user
 * Returns roll number, display name, and profile picture for all students with the same college code
 */
export const getStudentByCollegeCode = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user ID from auth middleware
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Fetch the current user to get their college code
        const currentUser = await userModel.findById(userId);
        if (!currentUser) {
            res.status(404).json({
                status: false,
                message: 'User context not found.'
            });
            return;
        }

        const collegeCode = currentUser.college_code;

        // Find all users of type 'student' by college code and select required fields
        const students = await userModel.find({
            college_code: collegeCode,
            user_type: 'student'
        }).select('_id id username profile_picture');

        // Fetch blocked students for this college to determine isBlocked status
        const blockedStudents = await BlockedStudentModel.find({ college_code: collegeCode })
            .select('student_id');
        const blockedStudentIds = new Set(blockedStudents.map(bs => bs.student_id ? bs.student_id.toString() : ''));

        // Since student_id in BlockedStudentModel refers to StudentModel._id, we need to map User._id to StudentModel._id
        // Ideally we would populate or do a lookup. 
        // For simplicity, let's fetch all StudentProfiles for these users
        const studentProfiles = await StudentModel.find({
            user_id: { $in: students.map(s => (s._id as any)) }
        }).select('user_id is_blocked');

        const blockedUserIds = new Set(
            studentProfiles
                .filter(sp => sp.is_blocked)
                .map(sp => (sp.user_id as any).toString())
        );

        // Map students to the desired format
        const studentData = students.map(student => ({
            id: (student._id as any).toString(),
            rollNumber: student.id,
            name: student.username,
            profilePicture: student.profile_picture || null, // Return null if empty, frontend will handle
            isBlocked: blockedUserIds.has((student._id as any).toString())
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
 * Automatically determines college code from the authenticated admin user
 * Returns roll number, display name, and profile picture for all blocked students in the same college
 */
export const getBlockedStudentsByCollegeCode = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get user ID from auth middleware
        const userId = (req as any).user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Fetch the current user to get their college code
        const currentUser = await userModel.findById(userId);
        if (!currentUser) {
            res.status(404).json({
                status: false,
                message: 'User context not found.'
            });
            return;
        }

        const collegeCode = currentUser.college_code;

        // Find all student IDs that are blocked in this college from BlockedStudentModel
        const blockedEntries = await BlockedStudentModel.find({
            college_code: collegeCode
        }).select('student_id reason');

        if (blockedEntries.length === 0) {
            res.status(200).json({
                status: true,
                message: 'No blocked students found with the provided college code.',
                data: []
            });
            return;
        }

        const blockedStudentIds = blockedEntries.map(entry => entry.student_id);

        // Fetch user details for these blocked students
        // Note: BlockedStudentModel `student_id` is likely StudentModel._id, not User._id
        // We first need to find User._ids corresponding to those StudentModel._ids
        const studentProfiles = await StudentModel.find({
            _id: { $in: blockedStudentIds }
        }).select('user_id');

        const userIds = studentProfiles.map(sp => sp.user_id);

        const blockedUsers = await userModel.find({
            _id: { $in: userIds },
            user_type: 'student'
        }).select('_id id username profile_picture');

        // Map students to the desired format, including the block reason if needed
        const studentData = blockedUsers.map(student => {
            // Find student profile to get back to the blocked entry
            const profile = studentProfiles.find(sp => sp.user_id.toString() === student._id.toString());
            const blockEntry = profile ? blockedEntries.find(entry => entry.student_id.toString() === profile._id.toString()) : null;

            return {
                id: student._id.toString(),
                rollNumber: student.id,
                name: student.username,
                profilePicture: student.profile_picture || null,
                isBlocked: true, // Known to be true because it's in BlockedStudent
                reason: blockEntry ? blockEntry.reason : null
            };
        });

        // Return blocked student details
        res.status(200).json({
            status: true,
            message: 'Blocked student details retrieved successfully.',
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

        // Find student by ID in userModel
        const student = await userModel.findById(studentId);
        if (!student || student.user_type !== 'student') {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        const studentProfile = await StudentModel.findOne({ user_id: student._id });
        if (!studentProfile) {
            res.status(404).json({
                status: false,
                message: 'Student profile not found.'
            });
            return;
        }

        // Toggle the blocked status
        const isCurrentlyBlocked = studentProfile.is_blocked;

        if (isCurrentlyBlocked) {
            // Unblock logic
            await BlockedStudentModel.findOneAndDelete({
                college_code: student.college_code,
                student_id: studentProfile._id
            });

            // Update models
            studentProfile.is_blocked = false;
        } else {
            // Block logic
            await BlockedStudentModel.findOneAndUpdate(
                {
                    college_code: student.college_code,
                    student_id: studentProfile._id
                },
                {
                    college_code: student.college_code,
                    student_id: studentProfile._id,
                    reason: "Manually blocked by admin" // Default reason for toggle
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Update models
            studentProfile.is_blocked = true;
        }

        await studentProfile.save();

        res.status(200).json({
            status: true,
            message: `Student ${!isCurrentlyBlocked ? 'blocked' : 'unblocked'} successfully.`,
            data: {
                id: student._id.toString(),
                isBlocked: !isCurrentlyBlocked
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
 * Block multiple students
 * @param req Request with students array in body
 * @param res Response with success/failure message
 */
export const blockMultipleStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate input using Zod
        const validation = validateBlockStudentsData(req.body);
        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const { students } = validation.data;

        // Get admin details to get college code
        const adminId = (req as any).user?.id;
        const adminUser = await userModel.findById(adminId);
        if (!adminUser || adminUser.user_type !== 'admin') {
            res.status(403).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        const collegeCode = adminUser.college_code;
        const blockedResults = [];
        const errors = [];

        // Process each student
        for (const studentData of students) {
            const { rollNumber, reason } = studentData;

            try {
                // 1. Find user (student) by roll number and college code
                const user = await userModel.findOne({
                    id: rollNumber,
                    college_code: collegeCode,
                    user_type: 'student'
                });

                if (!user) {
                    errors.push({ rollNumber, message: `Student not found in your college` });
                    continue;
                }

                // 2. Find corresponding Student model
                const studentProfile = await StudentModel.findOne({ user_id: user._id });

                if (!studentProfile) {
                    errors.push({ rollNumber, message: `Student profile not found` });
                    continue;
                }

                // 3. Add entry to BlockedStudentModel and update Student model
                // Upsert to handle re-blocking or updating reason
                const blockedEntry = await BlockedStudentModel.findOneAndUpdate(
                    {
                        college_code: collegeCode,
                        student_id: studentProfile._id
                    },
                    {
                        college_code: collegeCode,
                        student_id: studentProfile._id,
                        reason: reason
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                // Update is_blocked in Student.model
                studentProfile.is_blocked = true;
                await studentProfile.save();

                blockedResults.push({
                    rollNumber,
                    studentId: studentProfile._id,
                    reason: blockedEntry.reason
                });

            } catch (innerError) {
                console.error(`Error blocking student ${rollNumber}:`, innerError);
                errors.push({ rollNumber, message: 'Internal error processing block' });
            }
        }

        res.status(200).json({
            status: true,
            message: `Processed ${students.length} requests. Blocked: ${blockedResults.length}, Failed: ${errors.length}`,
            data: {
                blocked: blockedResults,
                failed: errors
            }
        });

    } catch (error) {
        console.error('Error blocking multiple students:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while blocking students.'
        });
    }
};

/**
 * Unblock multiple students
 * @param req Request with rollNumbers array in body
 * @param res Response with success/failure message
 */
export const unblockMultipleStudents = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate input using Zod
        const validation = validateUnblockStudentsData(req.body);
        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const { rollNumbers } = validation.data;

        // Get admin details to get college code
        const adminId = (req as any).user?.id;
        const adminUser = await userModel.findById(adminId);
        if (!adminUser || adminUser.user_type !== 'admin') {
            res.status(403).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        const collegeCode = adminUser.college_code;
        const unblockedResults = [];
        const errors = [];

        for (const rollNumber of rollNumbers) {
            try {
                // 1. Find user (student) by roll number and college code
                const user = await userModel.findOne({
                    id: rollNumber,
                    college_code: collegeCode,
                    user_type: 'student'
                });

                if (!user) {
                    errors.push({ rollNumber, message: `Student not found in your college` });
                    continue;
                }

                // 2. Find corresponding Student model
                const studentProfile = await StudentModel.findOne({ user_id: user._id });

                if (!studentProfile) {
                    errors.push({ rollNumber, message: `Student profile not found` });
                    continue;
                }

                // 3. Remove entry from BlockedStudentModel and update Student model
                const deleteResult = await BlockedStudentModel.findOneAndDelete({
                    college_code: collegeCode,
                    student_id: studentProfile._id
                });

                if (deleteResult) {
                    // Update is_blocked in Student.model
                    studentProfile.is_blocked = false;
                    await studentProfile.save();

                    unblockedResults.push({
                        rollNumber,
                        studentId: studentProfile._id
                    });
                } else {
                    // It's possible the student wasn't blocked, but we can consider it "unblocked" or note it
                    errors.push({ rollNumber, message: 'Student was not in the blocked list' });
                }

            } catch (innerError) {
                console.error(`Error unblocking student ${rollNumber}:`, innerError);
                errors.push({ rollNumber, message: 'Internal error processing unblock' });
            }
        }

        res.status(200).json({
            status: true,
            message: `Processed ${rollNumbers.length} requests. Unblocked: ${unblockedResults.length}, Failed/Not Blocked: ${errors.length}`,
            data: {
                unblocked: unblockedResults,
                failed: errors
            }
        });

    } catch (error) {
        console.error('Error unblocking multiple students:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while unblocking students.'
        });
    }
};

/**
 * Bulk student registration controller
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

        // Get admin user_id from token
        const adminId = (req as any).user?.id;
        if (!adminId) {
            res.status(401).json({ status: false, message: 'Admin authentication required.' });
            return;
        }

        // Delegate all further processing (college lookup, duplicate check, creation, emails) to service
        const results = await StudentServices.StudentService.bulkRegisterStudents(
            studentsArray,
            adminId
        );

        if (!results.success) {
            res.status(400).json({
                status: false,
                message: results.errors.length > 0 ? results.errors[0] : 'Bulk registration failed.',
                errors: results.errors
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: `Bulk registration completed. Registered: ${results.studentsRegistered} students`,
            registered: results.studentsRegistered,
            emailsSent: results.emailsSent,
            emailsFailed: results.emailsFailed,
            errors: results.errors
        });
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
        const adminUser = await userModel.findById(adminId);
        if (!adminUser || adminUser.user_type !== 'admin') {
            res.status(403).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        // Find the student in userModel to verify college code matches
        const student = await userModel.findById(studentId);
        if (!student || student.user_type !== 'student') {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        // Verify student belongs to admin's college
        if (student.college_code !== adminUser.college_code) {
            res.status(403).json({
                status: false,
                message: 'You do not have permission to delete students from other colleges.'
            });
            return;
        }

        // Delete the student from both collections
        await Promise.all([
            userModel.findByIdAndDelete(studentId),
            StudentModel.findOneAndDelete({ user_id: studentId })
        ]);

        // Return success response
        res.status(200).json({
            status: true,
            message: `Student ${student.username} (${student.id}) has been successfully deleted.`
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

        const adminUserRecord = await userModel.findById(admin.user_id);
        if (!adminUserRecord) {
            res.status(404).json({
                status: false,
                message: 'Admin user record not found.'
            });
            return;
        }

        // Verify the college code matches the admin's college code
        if (collegeCode !== adminUserRecord.college_code) {
            res.status(403).json({
                status: false,
                message: 'You do not have permission to delete students from other colleges.'
            });
            return;
        }

        // Find all students matching the roll numbers in this college using userModel
        const students = await userModel.find({
            college_code: collegeCode,
            id: { $in: rollNumbers },
            user_type: 'student'
        }).select('_id id username');

        if (students.length === 0) {
            res.status(404).json({
                status: false,
                message: 'No students found with the provided roll numbers.'
            });
            return;
        }

        // Extract student IDs for deletion
        const studentIds = students.map(student => student._id);

        // Delete all found students from both collections
        const [deleteResult] = await Promise.all([
            userModel.deleteMany({ _id: { $in: studentIds } }),
            StudentModel.deleteMany({ user_id: { $in: studentIds } })
        ]);

        // Return success response with simplified information about removed students
        res.status(200).json({
            status: true,
            message: `Successfully removed ${deleteResult.deletedCount} student(s).`,
            removedCount: deleteResult.deletedCount,
            notFound: rollNumbers.filter(roll =>
                !students.some(student => student.id === roll)
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
import { Request, Response } from 'express';
import { StudentService, StudentData } from '../../services/studentService';

/**
 * Simplified controller using service layer
 */
export const bulkStudentRegistrationV2 = async (req: Request, res: Response): Promise<void> => {
    try {
        const { students }: { students: StudentData[] } = req.body;
        
        // Basic validation
        if (!students || !Array.isArray(students) || students.length === 0) {
            res.status(400).json({
                status: false,
                message: 'Students array is required and must contain at least one student.'
            });
            return;
        }

        // Get admin ID from JWT
        const adminId = req.user?.id;
        if (!adminId) {
            res.status(401).json({
                status: false,
                message: 'Admin authentication required.'
            });
            return;
        }

        // Use service layer for business logic
        const result = await StudentService.bulkRegisterStudents(students, adminId);
        
        if (!result.success) {
            res.status(400).json({
                status: false,
                message: 'Registration failed',
                errors: result.errors
            });
            return;
        }

        // Success response
        res.status(201).json({
            status: true,
            message: `Successfully registered ${result.studentsRegistered} students`,
            data: {
                studentsRegistered: result.studentsRegistered,
                emailsSent: result.emailsSent,
                emailsFailed: result.emailsFailed,
                ...(result.errors.length > 0 && { emailErrors: result.errors })
            }
        });

    } catch (error) {
        console.error('Error in bulk student registration:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred during student registration.',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

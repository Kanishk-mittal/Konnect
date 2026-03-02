import { z } from 'zod';

export const blockStudentsSchema = z.object({
    students: z.array(z.object({
        rollNumber: z.string().min(1, 'Roll number is required'),
        reason: z.string().min(1, 'Reason is required')
    })).min(1, 'At least one student must be provided')
}).strict();

export type BlockStudentsData = z.infer<typeof blockStudentsSchema>;

export const validateBlockStudentsData = (data: unknown): { status: boolean; message: string; data?: BlockStudentsData } => {
    const result = blockStudentsSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

export const unblockStudentsSchema = z.object({
    rollNumbers: z.array(z.string().min(1, 'Roll number is required')).min(1, 'At least one roll number must be provided')
}).strict();

export type UnblockStudentsData = z.infer<typeof unblockStudentsSchema>;

export const validateUnblockStudentsData = (data: unknown): { status: boolean; message: string; data?: UnblockStudentsData } => {
    const result = unblockStudentsSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

export const updateStudentSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    email: z.email('Invalid email format').optional(),
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').optional(),
    rollNumber: z.string().regex(/^[A-Za-z0-9]{1,20}$/, 'Roll number must be alphanumeric (max 20 chars)').optional()
}).strict();

export type UpdateStudentData = z.infer<typeof updateStudentSchema>;

export const validateUpdateStudentData = (data: unknown): { status: boolean; message: string; data?: UpdateStudentData } => {
    const result = updateStudentSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

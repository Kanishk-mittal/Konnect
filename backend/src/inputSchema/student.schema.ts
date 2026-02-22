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

import { z } from 'zod';

export const adminLoginSchema = z.object({
    collegeCode: z.string().min(1, 'College code is required'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
}).strict();

export type AdminLoginData = z.infer<typeof adminLoginSchema>;

// Zod validation helper function for admin login
export const validateAdminLoginData = (data: unknown): { status: boolean; message: string; data?: AdminLoginData } => {
    const result = adminLoginSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};


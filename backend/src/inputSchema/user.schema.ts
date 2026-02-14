import { z } from 'zod';

/**
 * Schema for password change with OTP validation
 */
export const changePasswordSchema = z.object({
    previousPassword: z.string().min(1, 'Previous password is required'),
    newPassword: z.string()
        .min(12, 'New password must be at least 12 characters long')
        .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'New password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'New password must contain at least one special character'),
    otp: z.string().length(6, 'OTP must be exactly 6 characters')
}).strict();

/**
 * Type inferred from the schema
 */
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

/**
 * Utility function to validate password change data
 */
export const validateChangePasswordData = (data: unknown): { status: boolean; message: string; data?: ChangePasswordData } => {
    const result = changePasswordSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

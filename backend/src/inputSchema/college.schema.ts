
import { z } from 'zod';

export const collegeRegistrationSchema = z.object({
    collegeName: z.string().min(1, 'College name is required'),
    adminUsername: z.string().min(1, 'Admin username is required'),
    collegeCode: z.string().min(1, 'College code is required'),
    emailId: z.string().email('Invalid email address'),
    password: z.string()
        .min(12, 'Password must be at least 12 characters long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    otp: z.string().min(1, 'OTP is required'),
}).strict();

export type CollegeRegistrationData = z.infer<typeof collegeRegistrationSchema>;

// Zod validation helper function for college registration
export const validateCollegeRegistrationData = (data: CollegeRegistrationData): { status: boolean; message: string } => {
    const result = collegeRegistrationSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful' };
};

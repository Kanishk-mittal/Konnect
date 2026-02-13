import { z } from 'zod';

/**
 * Schema for club login data validation
 */
export const clubLoginSchema = z.object({
    collegeCode: z.string().min(1, 'College code is required'),
    clubName: z.string().min(1, 'Club name is required'),
    password: z.string().min(1, 'Password is required'),
}).strict();

/**
 * Type inferred from the schema
 */
export type ClubLoginData = z.infer<typeof clubLoginSchema>;

/**
 * Utility function to validate club login data
 */
export const validateClubLoginData = (data: unknown): { status: boolean; message: string; data?: ClubLoginData } => {
    const result = clubLoginSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

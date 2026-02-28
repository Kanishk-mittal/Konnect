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
 * Schema for creating a new club
 */
export const createClubSchema = z.object({
    clubName: z.string().min(1, 'Club name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * Type inferred from the create club schema
 */
export type CreateClubData = z.infer<typeof createClubSchema>;

/**
 * Utility function to validate create club data
 */
export const validateCreateClubData = (data: unknown): { status: boolean; message: string; data?: CreateClubData } => {
    const result = createClubSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

/**
 * Schema for adding club members validation
 */
export const addClubMembersSchema = z.object({
    members: z.array(
        z.object({
            roll: z.string().min(1, 'Roll number is required'),
            position: z.string().min(1, 'Position is required'),
        })
    ).min(1, 'At least one member is required'),
}).strict();

/**
 * Type inferred from the schema
 */
export type AddClubMembersData = z.infer<typeof addClubMembersSchema>;

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

/**
 * Utility function to validate add club members data
 */
export const validateAddClubMembersData = (data: unknown): { status: boolean; message: string; data?: AddClubMembersData } => {
    const result = addClubMembersSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

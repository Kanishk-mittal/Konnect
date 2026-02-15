import { z } from 'zod';

/**
 * Zod schema for group creation
 * Supports both announcement and chat groups.
 */
export const createGroupSchema = z.object({
    groupName: z.string().min(1, 'Group name is required').max(100, 'Group name is too long'),
    description: z.string().max(500, 'Description is too long').optional().default(''),
    admins: z.array(z.string()).min(1, 'At least one admin (roll number) is required'),
    members: z.array(z.object({
        name: z.string().optional(),
        rollNumber: z.string().min(1, 'Roll number is required'),
        emailId: z.email('Invalid email format').optional(),
    })).optional().default([]),
    isAnnouncementGroup: z.boolean().optional().default(false),
    isChatGroup: z.boolean().optional().default(false),
}).strict();

export type CreateGroupData = z.infer<typeof createGroupSchema>;

/**
 * Validates group creation data
 * @param data The raw input data to validate
 * @returns An object indicating success/failure and the validated data
 */
export const validateCreateGroupData = (data: unknown): { status: boolean; message: string; data?: CreateGroupData } => {
    const result = createGroupSchema.safeParse(data);
    if (!result.success) {
        const errorMessage = result.error.issues[0]?.message || 'Invalid input.';
        return { status: false, message: errorMessage };
    }
    return { status: true, message: 'Validation successful', data: result.data };
};

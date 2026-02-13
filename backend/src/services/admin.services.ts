/**
 * Returns the Admin collection _id for a given User collection _id.
 * @param userId - The _id of the user in the User collection
 * @returns The _id of the admin in the Admin collection, or null if not found
 */
export const getAdminId = async (userId: string): Promise<string | null> => {
    const admin = await AdminModel.findOne({ user_id: userId }).select('_id');
    return admin ? admin._id.toString() : null;
};

import UserModel from '../models/user.model';
import AdminModel from '../models/admin.model';
import { createUser } from './user.services';

export type RootAdminInput = {
    adminUsername: string;
    collegeCode: string;
    emailId: string;
    password: string;
};

export type NormalAdminInput = {
    adminUsername: string;
    collegeCode: string; // The ObjectId of the college
    emailId: string;
    password: string;
    createdBy: string;
};

export const checkExistingAdmin = async (collegeCode: string, emailId: string): Promise<{ exists: boolean; message?: string }> => {
    const existingAdmin = await UserModel.findOne({
        user_type: 'admin',
        college_code: collegeCode,
        email_id: emailId
    });

    if (existingAdmin) {
        let message = 'Registration failed. This email is already registered as an admin for this college.';
        return { exists: true, message };
    }

    return { exists: false };
};

/**
 * Creates a root admin for a college. Used during college registration.
 */
export const createRootAdmin = async (data: RootAdminInput): Promise<{ status: boolean; message: string; user?: any; rawKeys?: any }> => {
    try {
        const userResp = await createUser({
            userType: 'admin',
            id: data.emailId,
            collegeCode: data.collegeCode,
            emailId: data.emailId,
            username: data.adminUsername,
            password: data.password
        });

        if (!userResp.status || !userResp.user) {
            return { status: false, message: userResp.error || 'User creation failed' };
        }

        const newAdmin = new AdminModel({
            user_id: userResp.user._id,
            is_root_admin: true,
            created_by: null
        });

        await newAdmin.save();

        return {
            status: true,
            message: 'College root admin created successfully',
            user: userResp.user,
            rawKeys: userResp.rawKeys
        };
    } catch (error) {
        console.error('Error in createRootAdmin:', error);
        return { status: false, message: 'An unexpected error occurred during root admin creation.' };
    }
};

/**
 * Creates a normal admin for a college.
 */
export const createNormalAdmin = async (data: NormalAdminInput): Promise<{ status: boolean; message: string; user?: any; rawKeys?: any }> => {
    try {
        const userResp = await createUser({
            userType: 'admin',
            id: data.emailId,
            collegeCode: data.collegeCode,
            emailId: data.emailId,
            username: data.adminUsername,
            password: data.password
        });

        if (!userResp.status || !userResp.user) {
            return { status: false, message: userResp.error || 'User creation failed' };
        }

        const newAdmin = new AdminModel({
            user_id: userResp.user._id,
            is_root_admin: false,
            created_by: data.createdBy
        });

        await newAdmin.save();

        return {
            status: true,
            message: 'Admin created successfully',
            user: userResp.user,
            rawKeys: userResp.rawKeys
        };
    } catch (error) {
        console.error('Error in createNormalAdmin:', error);
        return { status: false, message: 'An unexpected error occurred during admin creation.' };
    }
};



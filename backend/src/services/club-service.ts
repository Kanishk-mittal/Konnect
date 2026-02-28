import UserModel from '../models/user.model';
import StudentModel from '../models/Student.model';
import ClubMembershipModel from '../models/clubMembership.model';
import { Types } from 'mongoose';

/**
 * Finds a club user by username, college code, and email (checked in id attribute).
 * @param username - The username of the club
 * @param collegeCode - The college code
 * @param email - The email to check in the id attribute
 * @returns The user document if found, otherwise null
 */
export const findClubUser = async (username: string, collegeCode: string, email: string) => {
    return await UserModel.findOne({
        user_type: 'club',
        username,
        college_code: collegeCode,
        id: email
    });
};
import ClubModel from '../models/club.model';
import { createUser, userDataInput, deleteUser } from './user.services';

/**
 * Deletes a club and its corresponding user record.
 * @param userId - The _id of the user in the User collection
 * @returns {Promise<{ status: boolean, error?: string }>}
 */
export const deleteClub = async (userId: string): Promise<{ status: boolean, error?: string }> => {
    try {
        // Step 1: Delete the club record (linked by club_user_id)
        const deletedClub = await ClubModel.findOneAndDelete({ user_id: userId });

        if (!deletedClub) {
            return { status: false, error: 'Club record associated with this user was not found.' };
        }

        // Step 2: Delete the user record
        const userResult = await deleteUser(userId);

        if (!userResult.status) {
            return { status: false, error: userResult.error || 'Failed to delete club user.' };
        }

        return { status: true };
    } catch (error) {
        return { status: false, error: (error as Error).message };
    }
};

/**
 * Creates a new club by first creating a corresponding user, then a club record.
 * @param clubData - Contains clubName, email, password, collegeCode, and adminId (creator)
 * @returns {Promise<{ status: boolean, error?: string, club?: any, user?: any, rawKeys?: any }>}
 */
export const createClub = async (clubData: {
    clubName: string;
    email: string;
    password: string;
    collegeCode: string;
    adminId: string;
}): Promise<{ status: boolean, error?: string, club?: any, user?: any }> => {
    // Step 1: Create the user (type: 'club')
    const userInput: userDataInput = {
        userType: 'club',
        id: clubData.email,
        collegeCode: clubData.collegeCode,
        emailId: clubData.email,
        username: clubData.clubName,
        password: clubData.password
    };
    const userResult = await createUser(userInput);
    if (!userResult.status || !userResult.user) {
        return { status: false, error: userResult.error || 'Failed to create club user.' };
    }

    // Step 2: Create the club record
    try {
        const clubDoc = new ClubModel({
            user_id: userResult.user._id,
            Club_name: clubData.clubName,
            email: clubData.email,
            college_code: clubData.collegeCode,
            created_by: clubData.adminId,
            blocked_users: []
        });
        const club = await clubDoc.save();
        return { status: true, club, user: userResult.user };
    } catch (error) {
        return { status: false, error: (error as Error).message };
    }
};

/**
 * Validates and processes a list of club members.
 * Checks if students exist in the college and if they are already members of the club.
 * 
 * @param members - Array of member data (roll number and position)
 * @param collegeCode - The college code to validate students against
 * @param clubId - The ID of the club to check for existing memberships
 * @returns An object containing valid members and validation errors
 */
export const validateClubMembers = async (
    members: Array<{ roll: string; position: string }>,
    collegeCode: string,
    clubId: string | Types.ObjectId
): Promise<{
    validMembers: Array<{ studentId: string; position: string; roll: string }>;
    validationErrors: Array<{ row: number; roll: string; error: string }>;
}> => {
    const validationErrors: Array<{ row: number; roll: string; error: string }> = [];
    const validMembers: Array<{ studentId: string; position: string; roll: string }> = [];

    for (const [index, member] of members.entries()) {
        // Roll number is stored as `id` on UserModel; college_code is also on UserModel
        const user = await UserModel.findOne({
            id: member.roll,
            college_code: collegeCode,
            user_type: 'student'
        });

        if (!user) {
            validationErrors.push({
                row: index + 1,
                roll: member.roll,
                error: 'Student not found in college'
            });
            continue;
        }

        // Find the Student document linked to this user
        const student = await StudentModel.findOne({ user_id: user._id });

        if (!student) {
            validationErrors.push({
                row: index + 1,
                roll: member.roll,
                error: 'Student not found in college'
            });
            continue;
        }

        // Check if already a member (member_id refs User, not Student)
        const existingMembership = await ClubMembershipModel.findOne({
            club_id: clubId,
            member_id: user._id
        });

        if (existingMembership) {
            // Already a member, skip silently as per controller logic
            continue;
        }

        validMembers.push({
            studentId: user._id.toString(), // member_id refs User._id
            position: member.position.trim(),
            roll: member.roll
        });
    }

    return { validMembers, validationErrors };
};

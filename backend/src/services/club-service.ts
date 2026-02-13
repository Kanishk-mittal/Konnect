import UserModel from '../models/user.model';

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
import { createUser, userDataInput } from './user.services';

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
            created_by: clubData.adminId,
            blocked_users: []
        });
        const club = await clubDoc.save();
        return { status: true, club, user: userResult.user };
    } catch (error) {
        return { status: false, error: (error as Error).message };
    }
};

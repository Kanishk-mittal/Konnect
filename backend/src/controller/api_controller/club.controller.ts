import type { Request, Response } from 'express';
import { createHash, verifyHash } from '../../utils/encryption/hash.utils';
import { generateAESKeyFromString, decryptAES } from '../../utils/encryption/aes.utils';
import ClubModel from '../../models/club.model';
import { createClub, findClubUser, deleteClub, validateClubMembers } from '../../services/club-service';
import { sendClubCredentialsEmail } from '../../utils/mailer.utils';
import UserModel, { UserDocument } from '../../models/user.model';
import StudentModel from '../../models/Student.model';
import ChatGroupModel from '../../models/chatGroup.model';
import AnnouncementGroupModel from '../../models/announcementGroup.model';
import ChatGroupMembershipModel from '../../models/chatGroupMembership.model';
import AnnouncementGroupMembershipModel from '../../models/announcementGroupMembership.model';
import ClubMembershipModel from '../../models/clubMembership.model';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';
import { sendOTPEmail } from '../../utils/mailer.utils';
import { OTP } from '../../utils/otp.utils';
import { validateClubLoginData, validateAddClubMembersData } from '../../inputSchema/club.schema';
import { getAdminId } from '../../services/admin.services';

// Types
type CreateClubPayload = {
    clubName: string;
    email: string;
    password: string;
};

// Club Login Controller
export const clubLoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const validation = validateClubLoginData(req.body);

        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const loginData = validation.data;

        // Client's public key (if provided) is stored by decryptRequest middleware
        const clientPublicKey = (req as any).clientPublicKey;

        // Find user by college code and club name (which is passed as 'clubName' in login input)
        const user = await UserModel.findOne({
            user_type: 'club',
            college_code: loginData.collegeCode,
            id: loginData.clubName
        });

        if (!user) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Verify password
        const isPasswordValid = await verifyHash(loginData.password, user.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid password.'
            });
            return;
        }

        // Set JWT token (this will overwrite any existing auth_token cookie)
        const jwtPayload = { type: 'club', id: user._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Decrypt private key from database using the provided password
        const privateKey = decryptAES(user.private_key, generateAESKeyFromString(loginData.password));

        // Return success response with sensitive data
        // The encryptResponse middleware will automatically encrypt this if a public key is available
        res.status(200).json({
            status: true,
            message: 'Login successful!',
            data: {
                id: user._id.toString(),
                privateKey: privateKey
            },
            // Include public key in response so resolvePublicKey middleware can use it
            publicKey: clientPublicKey
        });
    } catch (error) {
        console.error('Error in club login:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Create Club Controller
export const createClubController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const payload: CreateClubPayload = req.body;

        // Validate input using validateClubLoginData
        const validation = validateClubLoginData(payload);
        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        // Get admin's college_code
        const adminId = await getAdminId(req.user?.id || '');
        if (!adminId) {
            res.status(401).json({
                status: false,
                message: 'Admin authentication required to create a club.'
            });
            return;
        }
        const collegeCode = await UserModel.findById(req.user?.id).select('college_code').then(user => user?.college_code);

        if (!collegeCode) {
            res.status(400).json({
                status: false,
                message: 'Unable to determine college code for the admin.'
            })
            return;
        }

        // Check if a club user already exists with the same username, college code, and email (in id)
        const existingClubUser = await findClubUser(payload.clubName, collegeCode, payload.email);
        if (existingClubUser) {
            res.status(409).json({
                status: false,
                message: 'A club with this username and email already exists for this college.'
            });
            return;
        }

        // Use the new club service to create the user and club
        const result = await createClub({
            clubName: payload.clubName,
            email: payload.email,
            password: payload.password,
            collegeCode: collegeCode,
            adminId: adminId
        });

        if (!result.status) {
            res.status(500).json({
                status: false,
                message: result.error || 'Failed to create club.'
            });
            return;
        }

        // Send credentials email to the club
        try {
            await sendClubCredentialsEmail(
                payload.email,
                payload.clubName,
                collegeCode,
                payload.password
            );
        } catch (emailError) {
            console.error('Failed to send club credentials email:', emailError);
            // Do not fail the request if email sending fails
        }

        res.status(201).json({
            status: true,
            message: 'Club created successfully.',
            data: {
                id: result.club._id.toString(),
                clubName: payload.clubName,
                email: payload.email,
                userId: result.user._id,
            }
        });
    } catch (error) {
        console.error('Error in create club:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Get Clubs by College Code Controller
export const getClubsByCollegeCodeController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { collegeCode } = req.params;

        if (!collegeCode) {
            res.status(400).json({
                status: false,
                message: 'College code is required.'
            });
            return;
        }

        // Fetch all clubs for the college
        const clubs = await ClubModel.find({ college_code: collegeCode })
            .select('Club_name email icon')
            .lean();

        // Format response
        const formattedClubs = clubs.map(club => ({
            id: club._id.toString(),
            name: club.Club_name,
            email: club.email,
            icon: club.icon
        }));

        res.status(200).json({
            status: true,
            message: 'Clubs fetched successfully',
            data: formattedClubs
        });
    } catch (error) {
        console.error('Error in getClubsByCollegeCodeController:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Delete Club Controller
export const deleteClubController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clubId } = req.params;

        if (!clubId) {
            res.status(400).json({
                status: false,
                message: 'Club ID is required.'
            });
            return;
        }

        // Get admin's college code
        const adminUser = await UserModel.findById(req.user?.id).select('college_code');
        if (!adminUser) {
            res.status(401).json({ status: false, message: 'Admin not found.' });
            return;
        }

        // Find the club and populate its associated user to get the college code
        const club = await ClubModel.findById(clubId).populate<{ user_id: UserDocument }>('user_id');

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Extract the populated user (it will be of type UserDocument after population)
        const clubUser = club.user_id;

        if (!clubUser) {
            res.status(404).json({
                status: false,
                message: 'Club user record not found.'
            });
            return;
        }

        // Check if the college code matches
        if (clubUser.college_code !== adminUser.college_code) {
            res.status(403).json({
                status: false,
                message: 'You are not authorized to delete a club from another college.'
            });
            return;
        }

        // Delete the club and its corresponding user
        // Pass the user collection id as input (from the populated user's _id or club_user_id)
        const result = await deleteClub(clubUser._id.toString());

        if (!result.status) {
            res.status(500).json({
                status: false,
                message: result.error || 'Failed to delete club.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Club and associated user deleted successfully',
            data: {
                deletedClubId: clubId,
                deletedClubName: (club as any).Club_name
            }
        });
    } catch (error) {
        console.error('Error in deleteClubController:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Club Logout Controller
export const clubLogoutController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Clear the auth_token cookie
        res.clearCookie('auth_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });
        res.status(200).json({
            status: true,
            message: 'Logged out successfully.'
        });
    } catch (error) {
        console.error('Error during club logout:', error);
        res.status(500).json({
            status: false,
            message: 'An error occurred during logout.'
        });
    }
};

/**
 * Get all members (students) for a specific club
 * Fetches members based on ClubMembership records
 */
export const getClubMembersController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find club by the user_id (the account ID of the club)
        const club = await ClubModel.findOne({ user_id: userId });

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        const clubId = club._id;

        // Get all club memberships for this club with populated member data
        const memberships = await ClubMembershipModel.find({
            club_id: clubId
        }).populate('member_id', 'id username profile_picture');

        // Format the response
        const formattedMembers = memberships.map((membership: any) => ({
            id: membership.member_id._id.toString(),
            rollNumber: membership.member_id.id,
            name: membership.member_id.username,
            profilePicture: membership.member_id.profile_picture || null,
            position: membership.position,
            isBlocked: false,
            joinedAt: (membership as any).createdAt
        }));

        res.status(200).json({
            status: true,
            data: formattedMembers
        });
    } catch (error) {
        console.error('Error fetching club members:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching members.'
        });
    }
};

/**
 * Get blocked students for a specific club
 * Returns students blocked by the club's college
 */
export const getClubBlockedStudentsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find club by the user_id (the account ID of the club)
        const club = await ClubModel.findOne({ user_id: userId });

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get blocked users (ObjectIds referencing User collection)
        const blockedUserIds = club.blocked_users || [];

        if (blockedUserIds.length === 0) {
            res.status(200).json({
                status: true,
                data: []
            });
            return;
        }

        // Fetch user details for blocked user IDs
        const blockedUsers = await UserModel.find({
            _id: { $in: blockedUserIds }
        }).select('_id id username profile_picture');

        // Format the response maintaining the order from blocked_users array
        const formattedBlockedStudents = blockedUserIds.map(id => {
            const user = blockedUsers.find(u => u._id.toString() === id.toString());
            if (!user) return null;
            return {
                id: user._id.toString(),
                rollNumber: user.id, // 'id' stores the roll number in User model
                name: user.username, // 'username' stores the name in User model
                profilePicture: user.profile_picture || null,
                isBlocked: true
            };
        }).filter(Boolean);

        res.status(200).json({
            status: true,
            data: formattedBlockedStudents
        });
    } catch (error) {
        console.error('Error fetching blocked students:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching blocked students.'
        });
    }
};

/**
 * Get all groups (chat and announcement) created by a specific club
 */
export const getClubGroupsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find club to get college_code
        const club = await ClubModel.findOne({ user_id: userId }).select('college_code');

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get chat groups created by this club (using the user_id as created_by)
        const chatGroups = await ChatGroupModel.find({
            created_by: userId
        }).select('name description icon createdAt');

        // Get announcement groups created by this club
        const announcementGroups = await AnnouncementGroupModel.find({
            created_by: userId
        }).select('name description icon createdAt');

        // Count members for each group
        const formattedChatGroups = await Promise.all(
            chatGroups.map(async (group: any) => {
                const memberCount = await ChatGroupMembershipModel.countDocuments({ group: group._id });
                const adminCount = await ChatGroupMembershipModel.countDocuments({ group: group._id, isAdmin: true });
                return {
                    id: group._id.toString(),
                    name: group.name,
                    description: group.description || '',
                    icon: group.icon || null,
                    type: 'chat' as const,
                    memberCount,
                    adminCount,
                    createdAt: group.createdAt
                };
            })
        );

        const formattedAnnouncementGroups = await Promise.all(
            announcementGroups.map(async (group: any) => {
                const memberCount = await AnnouncementGroupMembershipModel.countDocuments({ group: group._id });
                const adminCount = await AnnouncementGroupMembershipModel.countDocuments({ group: group._id, isAdmin: true });
                return {
                    id: group._id.toString(),
                    name: group.name,
                    description: group.description || '',
                    icon: group.icon || null,
                    type: 'announcement' as const,
                    memberCount,
                    adminCount,
                    createdAt: group.createdAt
                };
            })
        );

        // Combine both types of groups
        const allGroups = [...formattedChatGroups, ...formattedAnnouncementGroups];

        res.status(200).json({
            status: true,
            data: allGroups
        });
    } catch (error) {
        console.error('Error fetching club groups:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching groups.'
        });
    }
};

/**
 * Add multiple members to a club via CSV upload
 * CSV format: roll, position
 */
export const addClubMembersController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Data is already decrypted by middleware
        const validation = validateAddClubMembersData(req.body);

        if (!validation.status || !validation.data) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const { members } = validation.data;
        const userId = req.user!.id;

        // Fetch user to get college code
        const user = await UserModel.findById(userId);
        if (!user) {
            res.status(404).json({
                status: false,
                message: 'User not found.'
            });
            return;
        }

        const collegeCode = user.college_code;

        // Find the club associated with this user
        const club = await ClubModel.findOne({ user_id: userId });
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club details not found.'
            });
            return;
        }

        const clubId = club._id;

        // Validate each member using the service
        const { validMembers, validationErrors } = await validateClubMembers(members, collegeCode, clubId);

        if (validationErrors.length > 0) {
            res.status(400).json({
                status: false,
                message: 'Validation failed for one or more members.',
                errors: validationErrors
            });
            return;
        }

        // Insert all valid members
        const membershipDocs = validMembers.map(m => ({
            club_id: clubId,
            student_id: m.studentId,
            position: m.position
        }));

        const inserted = await ClubMembershipModel.insertMany(membershipDocs);

        res.status(200).json({
            status: true,
            message: `Successfully added ${inserted.length} member(s) to the club.`,
            insertedCount: inserted.length
        });
    } catch (error) {
        console.error('Error adding club members:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while adding members.'
        });
    }
};

/**
 * Remove a member from a club
 * Deletes the ClubMembership record without affecting the student
 */
export const removeClubMemberController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId } = req.body;

        if (!studentId) {
            res.status(400).json({
                status: false,
                message: 'Student ID is required.'
            });
            return;
        }

        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find club by the user_id (the account ID of the club)
        const club = await ClubModel.findOne({ user_id: userId });

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        const clubId = club._id;

        // Find and delete the membership
        const membership = await ClubMembershipModel.findOneAndDelete({
            club_id: clubId,
            member_id: studentId
        });

        if (!membership) {
            res.status(404).json({
                status: false,
                message: 'Membership not found. This student is not a member of this club.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Member removed from club successfully.'
        });
    } catch (error) {
        console.error('Error removing club member:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while removing member.'
        });
    }
};

/**
 * Update a club member's position
 */
export const updateClubMemberPositionController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId, position } = req.body;

        if (!studentId) {
            res.status(400).json({
                status: false,
                message: 'Student ID is required.'
            });
            return;
        }

        if (!position || typeof position !== 'string' || position.trim() === '') {
            res.status(400).json({
                status: false,
                message: 'Position is required and must be a non-empty string.'
            });
            return;
        }

        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Find club by the user_id (the account ID of the club)
        const club = await ClubModel.findOne({ user_id: userId });

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        const clubId = club._id;

        // Verify student exists as a User
        const student = await UserModel.findById(studentId);
        if (!student) {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        // Find and update the membership
        const membership = await ClubMembershipModel.findOneAndUpdate(
            {
                club_id: clubId,
                member_id: studentId
            },
            {
                position: position.trim()
            },
            {
                new: true // Return the updated document
            }
        );

        if (!membership) {
            res.status(404).json({
                status: false,
                message: 'Membership not found. This student is not a member of this club.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Member position updated successfully.',
            data: {
                studentId: membership.member_id,
                clubId: membership.club_id,
                position: membership.position
            }
        });
    } catch (error) {
        console.error('Error updating club member position:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while updating position.'
        });
    }
};

/**
 * Remove multiple members from a club by roll numbers
 * Silently skips members that don't exist in the club
 */
export const removeClubMembersBulkController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { members } = req.body;

        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Validate input
        if (!members || !Array.isArray(members)) {
            res.status(400).json({
                status: false,
                message: 'Members array is required.'
            });
            return;
        }

        if (members.length === 0) {
            res.status(400).json({
                status: false,
                message: 'At least one member must be provided.'
            });
            return;
        }

        // Find club by the user_id
        const club = await ClubModel.findOne({ user_id: userId });

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        const clubId = club._id;

        // Extract roll numbers from members array
        const rollNumbers = members.map((m: { roll: string }) => m.roll).filter(Boolean);

        if (rollNumbers.length === 0) {
            res.status(400).json({
                status: false,
                message: 'No valid roll numbers provided.'
            });
            return;
        }

        // Find all students by roll numbers in the club's college using UserModel
        const students = await UserModel.find({
            id: { $in: rollNumbers }, // 'id' field stores roll number
            college_code: club.college_code,
            user_type: 'student'
        });

        // Extract student IDs
        const studentIds = students.map(s => s._id);

        // Delete all memberships for these students in this club
        const deleteResult = await ClubMembershipModel.deleteMany({
            club_id: clubId,
            member_id: { $in: studentIds }
        });

        res.status(200).json({
            status: true,
            message: `Successfully removed ${deleteResult.deletedCount} member(s) from the club.`,
            removedCount: deleteResult.deletedCount
        });
    } catch (error) {
        console.error('Error removing club members:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while removing members.'
        });
    }
};

/**
 * Block multiple students for a club by roll numbers
 * Adds students to club's blocked_students array, sorted by roll number
 * Avoids duplicate entries
 */
export const blockClubStudentsBulkController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { students } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        // Validate input
        if (!students || !Array.isArray(students)) {
            res.status(400).json({
                status: false,
                message: 'Students array is required.'
            });
            return;
        }

        if (students.length === 0) {
            res.status(400).json({
                status: false,
                message: 'At least one student must be provided.'
            });
            return;
        }

        // Find club by user_id
        const club = await ClubModel.findOne({ user_id: userId });
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Extract roll numbers from students array
        const rollNumbers = students.map((s: { roll: string }) => s.roll?.trim()).filter(Boolean);

        if (rollNumbers.length === 0) {
            res.status(400).json({
                status: false,
                message: 'No valid roll numbers provided.'
            });
            return;
        }

        // Verify students exist in the club's college using UserModel
        const foundStudents = await UserModel.find({
            id: { $in: rollNumbers },
            college_code: club.college_code,
            user_type: 'student'
        });

        if (foundStudents.length === 0) {
            res.status(404).json({
                status: false,
                message: 'No matching students found in the college.'
            });
            return;
        }

        // Get validated roll numbers of found students (using 'id' field which stores roll number)
        const validRollNumbers: string[] = foundStudents.map(s => s.id as string);

        // Get current blocked students
        const currentBlockedRolls: string[] = club.blocked_students || [];
        const currentBlockedSet = new Set<string>(currentBlockedRolls);

        // Filter out already blocked students
        const newRollsToBlock: string[] = validRollNumbers.filter(
            roll => !currentBlockedSet.has(roll)
        );

        if (newRollsToBlock.length === 0) {
            res.status(200).json({
                status: true,
                message: 'All provided students are already blocked.',
                blockedCount: 0
            });
            return;
        }

        // Add new roll numbers and sort in ascending order
        const updatedBlockedRolls: string[] = [...currentBlockedRolls, ...newRollsToBlock].sort((a, b) => {
            // Natural sort for roll numbers
            return a.localeCompare(b, undefined, { numeric: true });
        });

        // Update club with sorted blocked students list
        club.blocked_students = updatedBlockedRolls;
        await club.save();

        res.status(200).json({
            status: true,
            message: `Successfully blocked ${newRollsToBlock.length} student(s).`,
            blockedCount: newRollsToBlock.length
        });
    } catch (error) {
        console.error('Error blocking club students:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while blocking students.'
        });
    }
};

/**
 * Unblock a student from a club
 * Removes student from club's blocked_students array
 */
export const unblockClubStudentController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { studentId } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        if (!studentId) {
            res.status(400).json({
                status: false,
                message: 'Student ID is required.'
            });
            return;
        }

        // Verify club exists
        const club = await ClubModel.findOne({ user_id: userId });
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get student's roll number from UserModel
        const student = await UserModel.findById(studentId).select('id'); // 'id' field is roll for students
        if (!student) {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        // Check if student is in blocked list
        const currentBlockedRolls: string[] = club.blocked_students || [];
        const isBlocked = currentBlockedRolls.includes(student.id as string);

        if (!isBlocked) {
            res.status(404).json({
                status: false,
                message: 'Student is not in the blocked list.'
            });
            return;
        }

        // Remove student from blocked list
        club.blocked_students = currentBlockedRolls.filter(roll => roll !== student.id as string);
        await club.save();

        res.status(200).json({
            status: true,
            message: 'Student unblocked successfully.'
        });
    } catch (error) {
        console.error('Error unblocking club student:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while unblocking student.'
        });
    }
};

// Unblock club students in bulk (by roll numbers)
export const unblockClubStudentsBulkController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { students } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'Authentication required.'
            });
            return;
        }

        if (!students || !Array.isArray(students)) {
            res.status(400).json({
                status: false,
                message: 'Students array is required.'
            });
            return;
        }

        // Verify club exists
        const club = await ClubModel.findOne({ user_id: userId });
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Extract roll numbers from students array
        const rollNumbers = students.map(s => s.roll?.trim()).filter(Boolean);

        if (rollNumbers.length === 0) {
            res.status(400).json({
                status: false,
                message: 'No valid roll numbers provided.'
            });
            return;
        }

        // Verify students exist in the club's college
        const foundStudents = await UserModel.find({
            id: { $in: rollNumbers }, // 'id' field is roll for students
            college_code: club.college_code,
            user_type: 'student'
        }).select('id');

        if (foundStudents.length === 0) {
            res.status(404).json({
                status: false,
                message: 'No students found with the provided roll numbers.'
            });
            return;
        }

        // Get validated roll numbers
        const validRollNumbers: string[] = foundStudents.map(s => s.id as string);

        // Filter blocked list to remove students
        const currentBlockedRolls: string[] = club.blocked_students || [];
        const updatedBlockedList: string[] = currentBlockedRolls.filter(
            roll => !validRollNumbers.includes(roll)
        );

        const unblockedCount = currentBlockedRolls.length - updatedBlockedList.length;

        if (unblockedCount === 0) {
            res.status(404).json({
                status: false,
                message: 'None of the provided students were in the blocked list.'
            });
            return;
        }

        // Update club's blocked list
        club.blocked_students = updatedBlockedList;
        await club.save();

        res.status(200).json({
            status: true,
            message: `Successfully unblocked ${unblockedCount} student(s).`,
            data: {
                unblockedCount,
                totalProvided: rollNumbers.length,
                studentsFound: foundStudents.length
            }
        });
    } catch (error) {
        console.error('Error unblocking club students in bulk:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while unblocking students.'
        });
    }
};

import type { Request, Response } from 'express';
import { createHash, verifyHash } from '../../utils/encryption/hash.utils';
import { encryptRSA, generateRSAKeyPair } from '../../utils/encryption/rsa.utils';
import ClubModel from '../../models/club.model';
import AdminModel from '../../models/admin.model';
import StudentModel from '../../models/Student.model';
import BlockedStudentModel from '../../models/blockedStudent.model';
import ChatGroupModel from '../../models/chatGroup.model';
import AnnouncementGroupModel from '../../models/announcementGroup.model';
import ChatGroupMembershipModel from '../../models/chatGroupMembership.model';
import AnnouncementGroupMembershipModel from '../../models/announcementGroupMembership.model';
import ClubMembershipModel from '../../models/clubMembership.model';
import { setJwtCookie } from '../../utils/jwt/jwt.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';

// Types
type ClubLoginData = {
    collegeCode: string;
    clubName: string;
    password: string;
};

type CreateClubPayload = {
    clubName: string;
    email: string;
    password: string;
};

// Club Login Controller
export const clubLoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        // The middleware has already decrypted the request data
        const loginData: ClubLoginData = req.body;

        // Client's public key (if provided) is stored by decryptRequest middleware
        const clientPublicKey = (req as any).clientPublicKey;

        // Validate input
        if (!loginData.clubName || !loginData.collegeCode || !loginData.password) {
            res.status(400).json({
                status: false,
                message: 'College code, club name, and password are required.'
            });
            return;
        }

        // Find club by club name and college code
        const club = await ClubModel.findOne({
            Club_name: loginData.clubName,
            college_code: loginData.collegeCode
        });

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Verify password
        const isPasswordValid = await verifyHash(loginData.password, club.password_hash);
        if (!isPasswordValid) {
            res.status(401).json({
                status: false,
                message: 'Invalid password.'
            });
            return;
        }

        // Set JWT token (this will overwrite any existing auth_token cookie)
        const jwtPayload = { type: 'club', id: club._id.toString() };
        setJwtCookie(res, jwtPayload, 'auth_token', 30 * 24 * 60 * 60); // 1 month expiry

        // Return success response with sensitive data
        // The encryptResponse middleware will automatically encrypt this if a public key is available
        res.status(200).json({
            status: true,
            message: 'Login successful!',
            data: {
                privateKey: club.private_key,
                id: club._id.toString()
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

        // Validate input
        if (!payload.clubName || !payload.email || !payload.password) {
            res.status(400).json({
                status: false,
                message: 'Club name, email, and password are required.'
            });
            return;
        }

        // Get admin's college_code
        const admin = await AdminModel.findById(req.user?.id).select('college_code');
        if (!admin) {
            res.status(404).json({
                status: false,
                message: 'Admin not found.'
            });
            return;
        }

        const collegeCode = admin.college_code;

        // Check if club with same name already exists for this college
        const existingClub = await ClubModel.findOne({
            Club_name: payload.clubName,
            college_code: collegeCode
        });

        if (existingClub) {
            res.status(409).json({
                status: false,
                message: 'A club with this name already exists.'
            });
            return;
        }

        // Hash the password
        const passwordHash = await createHash(payload.password);

        // Generate RSA key pair for the club (for regular encryption)
        const [privateKey, publicKey] = generateRSAKeyPair();

        // Generate a separate RSA key pair for password recovery
        const [recoveryPrivateKey, recoveryPublicKey] = generateRSAKeyPair();

        // Encrypt the password with recovery public key to create recovery_password
        const recoveryPassword = encryptRSA(payload.password, recoveryPublicKey);

        // Handle optional local file upload + optional Cloudinary push
        let image:
            | { localPath: string; cloudUrl?: string }
            | undefined;

        if ((req as any).file) {
            const localPath = (req as any).file.path as string;
            image = { localPath };
            if (isCloudinaryConfigured()) {
                const uploaded = await uploadAndCleanup(localPath, { folder: 'konnect/clubs' });
                if (uploaded.success && uploaded.secure_url) {
                    image.cloudUrl = uploaded.secure_url;
                }
            }
        }

        // Choose icon value from cloud URL if available, else local
        const icon = image?.cloudUrl || image?.localPath || undefined;

        // Create the club
        const club = await ClubModel.create({
            Club_name: payload.clubName,
            college_code: collegeCode,
            email: payload.email,
            password_hash: passwordHash,
            recovery_password: recoveryPassword, // Encrypted password
            public_key: publicKey,
            private_key: privateKey,
            icon: icon
        });

        res.status(201).json({
            status: true,
            message: 'Club created successfully. Please save the recovery key securely!',
            data: {
                id: club._id.toString(),
                clubName: payload.clubName,
                email: payload.email,
                recoveryPrivateKey: recoveryPrivateKey // Send this to user to decrypt recovery_password later
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

        // Delete the club
        const deletedClub = await ClubModel.findByIdAndDelete(clubId);

        if (!deletedClub) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Club deleted successfully',
            data: {
                deletedClubId: clubId,
                deletedClubName: deletedClub.Club_name
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
 * Get club details by club ID
 * Returns club name, email, and college code
 */
export const getClubDetailsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clubId } = req.params;

        if (!clubId) {
            res.status(400).json({
                status: false,
                message: 'Club ID is required.'
            });
            return;
        }

        // Find club by ID and select only necessary fields
        const club = await ClubModel.findById(clubId).select('Club_name email college_code');

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            data: {
                clubName: club.Club_name,
                email: club.email,
                collegeCode: club.college_code,
                userId: clubId
            }
        });
    } catch (error) {
        console.error('Error fetching club details:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching club details.'
        });
    }
};

/**
 * Get club details from JWT token
 * Returns club name, email, and college code from authenticated club
 */
export const getClubDetailsFromJWTController = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                status: false,
                message: 'User not authenticated'
            });
            return;
        }

        // Find club by ID from JWT token and select only necessary fields
        const club = await ClubModel.findById(req.user.id).select('Club_name email college_code');

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Club details retrieved successfully.',
            data: {
                userId: req.user.id,
                clubName: club.Club_name,
                email: club.email,
                collegeCode: club.college_code
            }
        });
    } catch (error) {
        console.error('Error fetching club details from JWT:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred while fetching club details.'
        });
    }
};

/**
 * Get all members (students) for a specific club
 * Fetches members based on ClubMembership records
 */
export const getClubMembersController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { clubId } = req.params;

        if (!clubId) {
            res.status(400).json({
                status: false,
                message: 'Club ID is required.'
            });
            return;
        }

        // Find club to verify it exists
        const club = await ClubModel.findById(clubId);

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get all club memberships for this club with populated student data
        const memberships = await ClubMembershipModel.find({
            club_id: clubId
        }).populate('student_id', 'roll display_name profile_picture');

        // Format the response
        const formattedMembers = memberships.map((membership: any) => ({
            id: membership.student_id._id.toString(),
            rollNumber: membership.student_id.roll,
            name: membership.student_id.display_name,
            profilePicture: membership.student_id.profile_picture || null,
            position: membership.position,
            isBlocked: false,
            joinedAt: membership.created_at
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
        const { clubId } = req.params;

        if (!clubId) {
            res.status(400).json({
                status: false,
                message: 'Club ID is required.'
            });
            return;
        }

        // Find club
        const club = await ClubModel.findById(clubId);

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get blocked roll numbers
        const blockedRolls = club.blocked_students || [];

        if (blockedRolls.length === 0) {
            res.status(200).json({
                status: true,
                data: []
            });
            return;
        }

        // Fetch student details for blocked roll numbers
        const blockedStudents = await StudentModel.find({
            roll: { $in: blockedRolls },
            college_code: club.college_code
        }).select('_id roll display_name profile_picture');

        // Format the response maintaining the sort order from blocked_students array
        const formattedBlockedStudents = blockedRolls.map(roll => {
            const student = blockedStudents.find(s => s.roll === roll);
            if (!student) return null;
            return {
                id: student._id.toString(),
                rollNumber: student.roll,
                name: student.display_name,
                profilePicture: student.profile_picture || null,
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
        const { clubId } = req.params;

        if (!clubId) {
            res.status(400).json({
                status: false,
                message: 'Club ID is required.'
            });
            return;
        }

        // Find club to get college_code
        const club = await ClubModel.findById(clubId).select('college_code');

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get chat groups created by this club (where club is admin)
        const chatGroups = await ChatGroupModel.find({
            college_code: club.college_code,
            admin: clubId
        }).select('name description icon createdAt');

        // Get announcement groups created by this club
        const announcementGroups = await AnnouncementGroupModel.find({
            college_code: club.college_code,
            admin: clubId
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
        const { members, clubId } = req.body;

        // Validate payload structure
        if (!members || !Array.isArray(members)) {
            res.status(400).json({
                status: false,
                message: 'Members array is required'
            });
            return;
        }

        if (!clubId) {
            res.status(400).json({
                status: false,
                message: 'Club ID is required'
            });
            return;
        }

        // Verify club exists and get college code
        const club = await ClubModel.findById(clubId);
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        const collegeCode = club.college_code;

        // Validate each member
        const validationErrors: any[] = [];
        const validMembers: Array<{ studentId: string; position: string; roll: string }> = [];

        for (let i = 0; i < members.length; i++) {
            const member = members[i];

            if (!member.roll || !member.position) {
                validationErrors.push({
                    row: i + 1,
                    error: 'Roll number and position are required'
                });
                continue;
            }

            // Check if student exists in the college
            const student = await StudentModel.findOne({
                roll: member.roll,
                college_code: collegeCode
            });

            if (!student) {
                validationErrors.push({
                    row: i + 1,
                    roll: member.roll,
                    error: 'Student not found in college'
                });
                continue;
            }

            // Check if already a member - skip if they are
            const existingMembership = await ClubMembershipModel.findOne({
                club_id: clubId,
                student_id: student._id
            });

            if (existingMembership) {
                // Skip this member silently
                continue;
            }

            validMembers.push({
                studentId: student._id.toString(),
                position: member.position.trim(),
                roll: member.roll
            });
        }

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
        const { clubId, studentId } = req.body;

        if (!clubId || !studentId) {
            res.status(400).json({
                status: false,
                message: 'Club ID and Student ID are required.'
            });
            return;
        }

        // Verify club exists
        const club = await ClubModel.findById(clubId);
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Verify student exists
        const student = await StudentModel.findById(studentId);
        if (!student) {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        // Find and delete the membership
        const membership = await ClubMembershipModel.findOneAndDelete({
            club_id: clubId,
            student_id: studentId
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
 * Remove multiple members from a club by roll numbers
 * Silently skips members that don't exist in the club
 */
export const removeClubMembersBulkController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { members, clubId } = req.body;

        // Validate input
        if (!clubId || !members || !Array.isArray(members)) {
            res.status(400).json({
                status: false,
                message: 'Club ID and members array are required.'
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

        // Verify club exists
        const club = await ClubModel.findById(clubId);
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Extract roll numbers from members array
        const rollNumbers = members.map((m: { roll: string }) => m.roll).filter(Boolean);

        if (rollNumbers.length === 0) {
            res.status(400).json({
                status: false,
                message: 'No valid roll numbers provided.'
            });
            return;
        }

        // Find all students by roll numbers in the club's college
        const students = await StudentModel.find({
            roll: { $in: rollNumbers },
            college_code: club.college_code
        });

        // Extract student IDs
        const studentIds = students.map(s => s._id);

        // Delete all memberships for these students in this club
        const deleteResult = await ClubMembershipModel.deleteMany({
            club_id: clubId,
            student_id: { $in: studentIds }
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
        const { students, clubId } = req.body;

        // Validate input
        if (!clubId || !students || !Array.isArray(students)) {
            res.status(400).json({
                status: false,
                message: 'Club ID and students array are required.'
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

        // Verify club exists
        const club = await ClubModel.findById(clubId);
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

        // Verify students exist in the club's college
        const foundStudents = await StudentModel.find({
            roll: { $in: rollNumbers },
            college_code: club.college_code
        });

        if (foundStudents.length === 0) {
            res.status(404).json({
                status: false,
                message: 'No matching students found in the college.'
            });
            return;
        }

        // Get validated roll numbers of found students
        const validRollNumbers: string[] = foundStudents.map(s => s.roll as string);

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
        const { clubId, studentId } = req.body;

        if (!clubId || !studentId) {
            res.status(400).json({
                status: false,
                message: 'Club ID and Student ID are required.'
            });
            return;
        }

        // Verify club exists
        const club = await ClubModel.findById(clubId);
        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get student's roll number
        const student = await StudentModel.findById(studentId).select('roll');
        if (!student) {
            res.status(404).json({
                status: false,
                message: 'Student not found.'
            });
            return;
        }

        // Check if student is in blocked list
        const currentBlockedRolls: string[] = club.blocked_students || [];
        const isBlocked = currentBlockedRolls.includes(student.roll as string);

        if (!isBlocked) {
            res.status(404).json({
                status: false,
                message: 'Student is not in the blocked list.'
            });
            return;
        }

        // Remove student from blocked list
        club.blocked_students = currentBlockedRolls.filter(roll => roll !== student.roll as string);
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
        const { clubId, students } = req.body;

        if (!clubId || !students || !Array.isArray(students)) {
            res.status(400).json({
                status: false,
                message: 'Club ID and students array are required.'
            });
            return;
        }

        // Verify club exists
        const club = await ClubModel.findById(clubId);
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
        const foundStudents = await StudentModel.find({
            roll: { $in: rollNumbers },
            college_code: club.college_code
        }).select('roll');

        if (foundStudents.length === 0) {
            res.status(404).json({
                status: false,
                message: 'No students found with the provided roll numbers.'
            });
            return;
        }

        // Get validated roll numbers
        const validRollNumbers: string[] = foundStudents.map(s => s.roll as string);

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

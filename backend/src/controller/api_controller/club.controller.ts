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
 * Since clubs are associated with college_code, return all students from that college
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

        // Find club to get college_code
        const club = await ClubModel.findById(clubId).select('college_code');

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get all students from the same college
        const students = await StudentModel.find({
            college_code: club.college_code
        }).select('roll display_name profile_picture');

        // Format the response
        const formattedStudents = students.map((student: any) => ({
            id: student._id.toString(),
            rollNumber: student.roll,
            name: student.display_name,
            profilePicture: student.profile_picture || null,
            isBlocked: false
        }));

        res.status(200).json({
            status: true,
            data: formattedStudents
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

        // Find club to get college_code
        const club = await ClubModel.findById(clubId).select('college_code');

        if (!club) {
            res.status(404).json({
                status: false,
                message: 'Club not found.'
            });
            return;
        }

        // Get blocked students for this college
        const blockedStudents = await BlockedStudentModel.find({
            college_code: club.college_code
        }).populate('student_id', 'roll display_name profile_picture');

        // Format the response
        const formattedBlockedStudents = blockedStudents.map((blocked: any) => ({
            id: blocked.student_id._id.toString(),
            rollNumber: blocked.student_id.roll,
            name: blocked.student_id.display_name,
            profilePicture: blocked.student_id.profile_picture || null,
            isBlocked: true,
            reason: blocked.reason
        }));

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
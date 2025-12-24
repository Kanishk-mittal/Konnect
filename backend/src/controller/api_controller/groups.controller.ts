import { Request, Response } from 'express';
import { groupImageUpload } from '../../utils/multer.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';
import ChatGroupModel from '../../models/chatGroup.model';
import AnnouncementGroupModel from '../../models/announcementGroup.model';
import ChatGroupMembershipModel from '../../models/chatGroupMembership.model';
import AnnouncementGroupMembershipModel from '../../models/announcementGroupMembership.model';
import StudentModel from '../../models/Student.model';
import AdminModel from '../../models/admin.model';

// Export the configured multer upload for groups
export const upload = groupImageUpload;

// Types for group creation
type CreateGroupPayload = {
    groupName: string;
    description?: string;
    admins: string[];
    members?: Array<{ name?: string; rollNumber: string; emailId?: string }> | string[];
    isAnnouncementGroup?: boolean;
    isChatGroup?: boolean;
};

// Controller: Create a group
export const createGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Expect decrypted body
        const payload: CreateGroupPayload = req.body;

        // Basic validation
        if (!payload.groupName || !Array.isArray(payload.admins) || payload.admins.length === 0) {
            res.status(400).json({
                status: false,
                message: 'groupName and at least one admin are required.'
            });
            return;
        }

        // Get college_code from admin, club, or student
        let collegeCode: string;
        let creatorType: 'admin' | 'club' | 'user';
        let creatorId: string;

        // Try to find admin first
        const admin = await AdminModel.findById(req.user?.id).select('college_code');
        if (admin) {
            collegeCode = admin.college_code;
            creatorType = 'admin';
            creatorId = admin._id.toString();
        } else {
            // If not admin, try to find club
            const ClubModel = (await import('../../models/club.model')).default;
            const club = await ClubModel.findById(req.user?.id).select('college_code');
            if (club) {
                collegeCode = club.college_code;
                creatorType = 'club';
                creatorId = club._id.toString();
            } else {
                // If not admin or club, try to find student
                const student = await StudentModel.findById(req.user?.id).select('college_code');
                if (!student) {
                    res.status(404).json({
                        status: false,
                        message: 'User not found.'
                    });
                    return;
                }
                collegeCode = student.college_code as string;
                creatorType = 'user';
                creatorId = student._id.toString();
            }
        }

        // Normalize members into roll number strings
        const members: string[] = Array.isArray(payload.members)
            ? (typeof payload.members[0] === 'string'
                ? (payload.members as string[])
                : (payload.members as Array<{ rollNumber: string }>).map(m => m.rollNumber))
            : [];

        // Handle optional local file upload (via multer) + optional Cloudinary push
        let image:
            | { localPath: string; cloudUrl?: string }
            | undefined;

        if ((req as any).file) {
            const localPath = (req as any).file.path as string;
            image = { localPath };
            if (isCloudinaryConfigured()) {
                const uploaded = await uploadAndCleanup(localPath, { folder: 'konnect/groups' });
                if (uploaded.success && uploaded.secure_url) {
                    image.cloudUrl = uploaded.secure_url;
                }
            }
        }

        // Choose icon value from cloud URL if available, else local
        const icon = image?.cloudUrl || image?.localPath || undefined;

        // Persist to DB using appropriate model(s)
        const results: Array<{ id: string; type: 'announcement' | 'chat'; name: string; description?: string; icon?: string; createdAt: Date; membersAdded: number }> = [];

        if (payload.isAnnouncementGroup) {
            // Find admin students by roll numbers to get their ObjectIds
            const adminStudents = await StudentModel.find({
                roll: { $in: payload.admins }
            }).select('_id roll');

            const adminIds = adminStudents.map(student => student._id);

            const annDoc = await AnnouncementGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon,
                college_code: collegeCode,
                admin: adminIds,
                adminType: creatorType // 'admin' or 'club' based on who created it
            });

            // Add members to announcement group
            let membersAdded = 0;
            if (members.length > 0) {
                // Find students by roll numbers
                const students = await StudentModel.find({
                    roll: { $in: members }
                }).select('_id roll');

                // Create membership entries
                const membershipPromises = students.map(async (student) => {
                    const isAdmin = payload.admins.includes(student.roll as string);
                    return AnnouncementGroupMembershipModel.create({
                        member: student._id,
                        group: annDoc._id,
                        admin: isAdmin
                    });
                });

                const createdMemberships = await Promise.all(membershipPromises);
                membersAdded = createdMemberships.length;
            }

            results.push({
                id: annDoc._id.toString(),
                type: 'announcement',
                name: annDoc.name as string,
                description: annDoc.description as string,
                icon: annDoc.icon as string,
                createdAt: annDoc.createdAt as Date,
                membersAdded
            });
        }

        if (payload.isChatGroup) {
            // Find admin students by roll numbers to get their ObjectIds
            const adminStudents = await StudentModel.find({
                roll: { $in: payload.admins }
            }).select('_id roll');

            const adminIds = adminStudents.map(student => student._id);

            const chatDoc = await ChatGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon,
                college_code: collegeCode,
                admin: adminIds
            });

            // Add members to chat group
            let membersAdded = 0;
            if (members.length > 0) {
                // Find students by roll numbers
                const students = await StudentModel.find({
                    roll: { $in: members }
                }).select('_id roll');

                // Create membership entries
                const membershipPromises = students.map(async (student) => {
                    const isAdmin = payload.admins.includes(student.roll as string);
                    return ChatGroupMembershipModel.create({
                        member: student._id,
                        group: chatDoc._id,
                        isAdmin
                    });
                });

                const createdMemberships = await Promise.all(membershipPromises);
                membersAdded = createdMemberships.length;
            }

            results.push({
                id: chatDoc._id.toString(),
                type: 'chat',
                name: chatDoc.name as string,
                description: chatDoc.description as string,
                icon: chatDoc.icon as string,
                createdAt: chatDoc.createdAt as Date,
                membersAdded
            });
        }

        // If neither flag set, default to chat group creation
        if (!payload.isAnnouncementGroup && !payload.isChatGroup) {
            // Find admin students by roll numbers to get their ObjectIds
            const adminStudents = await StudentModel.find({
                roll: { $in: payload.admins }
            }).select('_id roll');

            const adminIds = adminStudents.map(student => student._id);

            const chatDoc = await ChatGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon,
                college_code: collegeCode,
                admin: adminIds
            });

            // Add members to chat group
            let membersAdded = 0;
            if (members.length > 0) {
                // Find students by roll numbers
                const students = await StudentModel.find({
                    roll: { $in: members }
                }).select('_id roll');

                // Create membership entries
                const membershipPromises = students.map(async (student) => {
                    const isAdmin = payload.admins.includes(student.roll as string);
                    return ChatGroupMembershipModel.create({
                        member: student._id,
                        group: chatDoc._id,
                        isAdmin
                    });
                });

                const createdMemberships = await Promise.all(membershipPromises);
                membersAdded = createdMemberships.length;
            }

            results.push({
                id: chatDoc._id.toString(),
                type: 'chat',
                name: chatDoc.name as string,
                description: chatDoc.description as string,
                icon: chatDoc.icon as string,
                createdAt: chatDoc.createdAt as Date,
                membersAdded
            });
        }

        res.status(201).json({
            status: true,
            message: results.length > 1 ? 'Groups created successfully' : 'Group created successfully',
            data: {
                created: results,
                image: image,
                createdBy: req.user?.id || 'unknown'
            }
        });
    } catch (error) {
        console.error('Error in createGroupController:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Controller: Get groups by college code
export const getGroupsByCollegeCodeController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { collegeCode } = req.params;

        if (!collegeCode) {
            res.status(400).json({
                status: false,
                message: 'College code is required.'
            });
            return;
        }

        // Fetch both chat and announcement groups for the college
        const [chatGroups, announcementGroups] = await Promise.all([
            ChatGroupModel.find({ college_code: collegeCode })
                .select('name description icon createdAt')
                .lean(),
            AnnouncementGroupModel.find({ college_code: collegeCode })
                .select('name description icon admin createdAt')
                .lean()
        ]);

        // Get member counts for each group
        const chatGroupIds = chatGroups.map(g => g._id);
        const announcementGroupIds = announcementGroups.map(g => g._id);

        const [chatMemberCounts, announcementMemberCounts] = await Promise.all([
            ChatGroupMembershipModel.aggregate([
                { $match: { group: { $in: chatGroupIds } } },
                { $group: { _id: '$group', count: { $sum: 1 } } }
            ]),
            AnnouncementGroupMembershipModel.aggregate([
                { $match: { group: { $in: announcementGroupIds } } },
                { $group: { _id: '$group', count: { $sum: 1 } } }
            ])
        ]);

        // Create member count maps
        const chatMemberCountMap = new Map(chatMemberCounts.map(c => [c._id.toString(), c.count]));
        const announcementMemberCountMap = new Map(announcementMemberCounts.map(c => [c._id.toString(), c.count]));

        // Format response
        const formattedChatGroups = chatGroups.map(group => ({
            id: group._id.toString(),
            name: group.name,
            description: group.description || '',
            icon: group.icon || null,
            type: 'chat',
            memberCount: chatMemberCountMap.get(group._id.toString()) || 0,
            createdAt: group.createdAt
        }));

        const formattedAnnouncementGroups = announcementGroups.map(group => ({
            id: group._id.toString(),
            name: group.name,
            description: group.description || '',
            icon: group.icon || null,
            type: 'announcement',
            adminCount: Array.isArray(group.admin) ? group.admin.length : 0,
            memberCount: announcementMemberCountMap.get(group._id.toString()) || 0,
            createdAt: group.createdAt
        }));

        const allGroups = [...formattedChatGroups, ...formattedAnnouncementGroups]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.status(200).json({
            status: true,
            message: 'Groups fetched successfully',
            data: allGroups
        });
    } catch (error) {
        console.error('Error in getGroupsByCollegeCodeController:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};

// Controller: Delete a group
export const deleteGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const { groupType } = req.body; // 'chat', 'announcement', or 'both'

        if (!groupId) {
            res.status(400).json({
                status: false,
                message: 'Group ID is required.'
            });
            return;
        }

        if (!groupType) {
            res.status(400).json({
                status: false,
                message: 'Group type is required.'
            });
            return;
        }

        // Check if user is college admin
        const admin = await AdminModel.findById(req.user?.id);
        const isCollegeAdmin = !!admin;

        // Check if user is group admin for the specified group type
        let isGroupAdmin = false;
        if (!isCollegeAdmin) {
            if (groupType === 'chat' || groupType === 'both') {
                const chatGroup = await ChatGroupModel.findById(groupId);
                if (chatGroup && chatGroup.admin) {
                    isGroupAdmin = chatGroup.admin.some(adminId => adminId.toString() === req.user?.id);
                }
            }
            if (!isGroupAdmin && (groupType === 'announcement' || groupType === 'both')) {
                const announcementGroup = await AnnouncementGroupModel.findById(groupId);
                if (announcementGroup && announcementGroup.admin) {
                    isGroupAdmin = announcementGroup.admin.some(adminId => adminId.toString() === req.user?.id);
                }
            }
        }

        // If user is neither college admin nor group admin, deny access
        if (!isCollegeAdmin && !isGroupAdmin) {
            res.status(403).json({
                status: false,
                message: 'You do not have permission to delete this group.'
            });
            return;
        }

        const deletionResults: string[] = [];

        // Delete chat group if specified
        if (groupType === 'chat' || groupType === 'both') {
            // Delete all memberships first
            await ChatGroupMembershipModel.deleteMany({ group: groupId });

            // Delete the group
            const deletedChatGroup = await ChatGroupModel.findByIdAndDelete(groupId);
            if (deletedChatGroup) {
                deletionResults.push('chat');
            }
        }

        // Delete announcement group if specified
        if (groupType === 'announcement' || groupType === 'both') {
            // Delete all memberships first
            await AnnouncementGroupMembershipModel.deleteMany({ group: groupId });

            // Delete the group
            const deletedAnnouncementGroup = await AnnouncementGroupModel.findByIdAndDelete(groupId);
            if (deletedAnnouncementGroup) {
                deletionResults.push('announcement');
            }
        }

        if (deletionResults.length === 0) {
            res.status(404).json({
                status: false,
                message: 'Group not found.'
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: `${deletionResults.join(' and ')} group(s) deleted successfully`,
            data: {
                deletedTypes: deletionResults
            }
        });
    } catch (error) {
        console.error('Error in deleteGroupController:', error);
        res.status(500).json({
            status: false,
            message: 'An unexpected error occurred.'
        });
    }
};
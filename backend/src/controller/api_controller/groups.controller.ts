import { Request, Response } from 'express';
import { groupImageUpload } from '../../utils/multer.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';
import ChatGroupModel from '../../models/chatGroup.model';
import AnnouncementGroupModel from '../../models/announcementGroup.model';
import ChatGroupMembershipModel from '../../models/chatGroupMembership.model';
import AnnouncementGroupMembershipModel from '../../models/announcementGroupMembership.model';

import { validateCreateGroupData, CreateGroupData } from '../../inputSchema/group.schema';
import userModel from '../../models/user.model';

// Export the configured multer upload for groups
export const upload = groupImageUpload;

// Controller: Create a group
export const createGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Validation using Zod
        const validation = validateCreateGroupData(req.body);
        if (!validation.status) {
            res.status(400).json({
                status: false,
                message: validation.message
            });
            return;
        }

        const payload = validation.data!;

        if (!req.user?.id) {
            res.status(401).json({
                status: false,
                message: 'User authentication required.'
            });
            return;
        }

        const creatorId = req.user.id;

        // Get college_code and identification ID (roll number) from user model 
        const user = await userModel.findById(creatorId).select('college_code user_type id').lean();
        if (!user) {
            res.status(404).json({
                status: false,
                message: 'Authenticated user not found.'
            });
            return;
        }

        const collegeCode = user.college_code;
        const creatorRoll = user.id;

        // Resolve all involved roll numbers to User ObjectIds
        // Automatically add creator as an admin
        const adminRolls = [...new Set([...payload.admins, creatorRoll])];
        const memberRolls = payload.members.map(m => m.rollNumber);
        const allUniqueRolls = [...new Set([...adminRolls, ...memberRolls])];

        const users = await userModel.find({
            id: { $in: allUniqueRolls },
            college_code: collegeCode
        }).select('_id id').lean();

        const userMap = new Map<string, string>(users.map(u => [u.id, u._id.toString()]));

        // Handle optional local file upload (via multer) + optional Cloudinary push
        let image: { localPath: string; cloudUrl?: string } | undefined;

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
        const results: any[] = [];

        // Helper function for mass membership creation
        const createMemberships = async (groupId: string, isAnnouncement: boolean) => {
            const membershipDocs = allUniqueRolls
                .filter(roll => userMap.has(roll))
                .map(roll => ({
                    member: userMap.get(roll),
                    group: groupId,
                    isAdmin: adminRolls.includes(roll)
                }));

            if (membershipDocs.length === 0) return 0;

            if (isAnnouncement) {
                await AnnouncementGroupMembershipModel.insertMany(membershipDocs);
            } else {
                await ChatGroupMembershipModel.insertMany(membershipDocs);
            }
            return membershipDocs.length;
        };

        // Create Announcement Group
        if (payload.isAnnouncementGroup) {
            const annDoc = await AnnouncementGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon,
                college_code: collegeCode,
                created_by: creatorId
            });

            const membersAdded = await createMemberships(annDoc._id.toString(), true);

            results.push({
                id: annDoc._id.toString(),
                type: 'announcement',
                name: annDoc.name,
                description: annDoc.description,
                icon: annDoc.icon,
                createdAt: (annDoc as any).createdAt,
                membersAdded
            });
        }

        // Create Chat Group
        if (payload.isChatGroup || (!payload.isAnnouncementGroup && !payload.isChatGroup)) {
            const chatDoc = await ChatGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon,
                college_code: collegeCode,
                created_by: creatorId
            });

            const membersAdded = await createMemberships(chatDoc._id.toString(), false);

            results.push({
                id: chatDoc._id.toString(),
                type: 'chat',
                name: chatDoc.name,
                description: chatDoc.description,
                icon: chatDoc.icon,
                createdAt: (chatDoc as any).createdAt,
                membersAdded
            });
        }

        res.status(201).json({
            status: true,
            message: results.length > 1 ? 'Groups created successfully' : 'Group created successfully',
            data: {
                created: results,
                image: image,
                createdBy: creatorId
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

// Controller: Get groups created by the authenticated user
export const getUserGroupsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                status: false,
                message: 'User authentication required.'
            });
            return;
        }

        // Fetch both chat and announcement groups created by the user
        const [chatGroups, announcementGroups] = await Promise.all([
            ChatGroupModel.find({ created_by: userId })
                .select('name description icon createdAt')
                .lean(),
            AnnouncementGroupModel.find({ created_by: userId })
                .select('name description icon createdAt')
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
            memberCount: announcementMemberCountMap.get(group._id.toString()) || 0,
            createdAt: group.createdAt
        }));

        const allGroups = [...formattedChatGroups, ...formattedAnnouncementGroups]
            .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());

        res.status(200).json({
            status: true,
            message: 'User groups fetched successfully',
            data: allGroups
        });
    } catch (error) {
        console.error('Error in getUserGroupsController:', error);
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
        const isCollegeAdmin = req.user?.type === 'admin';

        // Check if user is group admin for the specified group type
        let isGroupAdmin = false;
        if (!isCollegeAdmin && req.user?.id) {
            const userId = req.user.id;

            if (groupType === 'chat' || groupType === 'both') {
                const membership = await ChatGroupMembershipModel.findOne({
                    group: groupId,
                    member: userId,
                    isAdmin: true
                });
                if (membership) isGroupAdmin = true;
            }

            if (!isGroupAdmin && (groupType === 'announcement' || groupType === 'both')) {
                const membership = await AnnouncementGroupMembershipModel.findOne({
                    group: groupId,
                    member: userId,
                    isAdmin: true
                });
                if (membership) isGroupAdmin = true;
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
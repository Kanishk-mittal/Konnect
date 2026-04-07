import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { groupImageUpload } from '../../utils/multer.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';
import ChatGroupModel from '../../models/chatGroup.model';
import AnnouncementGroupModel from '../../models/announcementGroup.model';
import ChatGroupMembershipModel from '../../models/chatGroupMembership.model';
import AnnouncementGroupMembershipModel from '../../models/announcementGroupMembership.model';

import { validateCreateGroupData, CreateGroupData, validateUpdateGroupData } from '../../inputSchema/group.schema';
import userModel from '../../models/user.model';
import { getMemberChatGroups, getMemberAnnouncementGroups } from '../../services/group.services';
import { decryptAES } from '../../utils/encryption/aes.utils';
import { internalAesKey } from '../../constants/keys';

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

            const annId = annDoc._id as Types.ObjectId;
            const membersAdded = await createMemberships(annId.toString(), true);

            results.push({
                id: annId.toString(),
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

            const chatId = chatDoc._id as Types.ObjectId;
            const membersAdded = await createMemberships(chatId.toString(), false);

            results.push({
                id: chatId.toString(),
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

        // Fetch both chat and announcement groups user is member of
        const [chatGroups, announcementGroups] = await Promise.all([
            getMemberChatGroups(userId),
            getMemberAnnouncementGroups(userId)
        ]);

        const allGroups = [...chatGroups, ...announcementGroups]
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

// Controller: Delete a chat group
export const deleteChatGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        // User must be a member AND an admin of the group
        const membership = await ChatGroupMembershipModel.findOne({
            group: groupId,
            member: userId,
            isAdmin: true
        });

        if (!membership) {
            res.status(403).json({
                status: false,
                message: 'You do not have permission to delete this group.'
            });
            return;
        }

        // Delete all memberships first, then the group
        await ChatGroupMembershipModel.deleteMany({ group: groupId });
        const deletedGroup = await ChatGroupModel.findByIdAndDelete(groupId);

        if (!deletedGroup) {
            res.status(404).json({ status: false, message: 'Chat group not found.' });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Chat group deleted successfully',
            data: { id: groupId, type: 'chat' }
        });
    } catch (error) {
        console.error('Error in deleteChatGroupController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Delete an announcement group
export const deleteAnnouncementGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        // User must be a member AND an admin of the group
        const membership = await AnnouncementGroupMembershipModel.findOne({
            group: groupId,
            member: userId,
            isAdmin: true
        });

        if (!membership) {
            res.status(403).json({
                status: false,
                message: 'You do not have permission to delete this group.'
            });
            return;
        }

        // Delete all memberships first, then the group
        await AnnouncementGroupMembershipModel.deleteMany({ group: groupId });
        const deletedGroup = await AnnouncementGroupModel.findByIdAndDelete(groupId);

        if (!deletedGroup) {
            res.status(404).json({ status: false, message: 'Announcement group not found.' });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Announcement group deleted successfully',
            data: { id: groupId, type: 'announcement' }
        });
    } catch (error) {
        console.error('Error in deleteAnnouncementGroupController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Get Chat Group Info
export const getChatGroupInfoController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        if (!groupId) {
            res.status(400).json({ status: false, message: 'Group ID is required.' });
            return;
        }

        if (!Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID format.' });
            return;
        }

        // 1. Check if user is a member
        const membership = await ChatGroupMembershipModel.findOne({ group: groupId, member: userId });
        if (!membership) {
            res.status(403).json({ status: false, message: 'You are not a member of this group.' });
            return;
        }

        // 2. Get group details
        const group = await ChatGroupModel.findById(groupId).lean();
        if (!group) {
            res.status(404).json({ status: false, message: 'Chat group not found.' });
            return;
        }

        // 3. Get members with their details
        const members = await ChatGroupMembershipModel.aggregate([
            { $match: { group: new Types.ObjectId(groupId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'member',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    user_id: '$userDetails._id',
                    id: '$userDetails.id',
                    username: '$userDetails.username',
                    isAdmin: '$isAdmin'
                }
            }
        ]);

        // 4. Combine and send response
        const responseData = {
            name: group.name,
            icon: group.icon || null,
            description: group.description || '',
            members: members
        };

        res.status(200).json({
            status: true,
            message: 'Chat group information fetched successfully.',
            data: responseData
        });

    } catch (error) {
        console.error('Error in getChatGroupInfoController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Get Chat Group Members' Public Keys
export const getChatGroupMembersKeysController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        if (!groupId) {
            res.status(400).json({ status: false, message: 'Group ID is required.' });
            return;
        }

        if (!Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID format.' });
            return;
        }

        // 1. Check if user is a member
        const membership = await ChatGroupMembershipModel.findOne({ group: groupId, member: userId });
        if (!membership) {
            res.status(403).json({ status: false, message: 'You are not a member of this group.' });
            return;
        }

        // 2. Get all members with their public keys
        const membersKeysFromDb = await ChatGroupMembershipModel.aggregate([
            { $match: { group: new Types.ObjectId(groupId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'member',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    user_id: '$userDetails._id',
                    publicKey: '$userDetails.public_key'
                }
            }
        ]);

        // Decrypt each public key
        const membersKeys = membersKeysFromDb.map(member => ({
            user_id: member.user_id,
            publicKey: decryptAES(member.publicKey, internalAesKey)
        }));

        res.status(200).json({
            status: true,
            message: 'Chat group members keys fetched successfully.',
            data: membersKeys
        });

    } catch (error) {
        console.error('Error in getChatGroupMembersKeysController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Get Announcement Group Info
export const getAnnouncementGroupInfoController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        if (!groupId) {
            res.status(400).json({ status: false, message: 'Group ID is required.' });
            return;
        }

        if (!Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID format.' });
            return;
        }

        // 1. Check if user is a member
        const membership = await AnnouncementGroupMembershipModel.findOne({ group: groupId, member: userId });
        if (!membership) {
            res.status(403).json({ status: false, message: 'You are not a member of this group.' });
            return;
        }

        // 2. Get group details
        const group = await AnnouncementGroupModel.findById(groupId).lean();
        if (!group) {
            res.status(404).json({ status: false, message: 'Announcement group not found.' });
            return;
        }

        // 3. Get members with their details
        const members = await AnnouncementGroupMembershipModel.aggregate([
            { $match: { group: new Types.ObjectId(groupId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'member',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    user_id: '$userDetails._id',
                    id: '$userDetails.id',
                    username: '$userDetails.username',
                    isAdmin: '$isAdmin'
                }
            }
        ]);

        // 4. Combine and send response
        const responseData = {
            name: group.name,
            icon: group.icon || null,
            description: group.description || '',
            members: members
        };

        res.status(200).json({
            status: true,
            message: 'Announcement group information fetched successfully.',
            data: responseData
        });

    } catch (error) {
        console.error('Error in getAnnouncementGroupInfoController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Get Announcement Group Members' Public Keys
export const getAnnouncementGroupMembersKeysController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        if (!groupId) {
            res.status(400).json({ status: false, message: 'Group ID is required.' });
            return;
        }

        if (!Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID format.' });
            return;
        }

        // 1. Check if user is a member
        const membership = await AnnouncementGroupMembershipModel.findOne({ group: groupId, member: userId });
        if (!membership) {
            res.status(403).json({ status: false, message: 'You are not a member of this announcement group.' });
            return;
        }

        // 2. Get all members with their public keys
        const membersKeysFromDb = await AnnouncementGroupMembershipModel.aggregate([
            { $match: { group: new Types.ObjectId(groupId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'member',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            { $unwind: '$userDetails' },
            {
                $project: {
                    _id: 0,
                    user_id: '$userDetails._id',
                    publicKey: '$userDetails.public_key'
                }
            }
        ]);

        // Decrypt each public key
        const membersKeys = membersKeysFromDb.map(member => ({
            user_id: member.user_id,
            publicKey: decryptAES(member.publicKey, internalAesKey)
        }));

        res.status(200).json({
            status: true,
            message: 'Announcement group members keys fetched successfully.',
            data: membersKeys
        });

    } catch (error) {
        console.error('Error in getAnnouncementGroupMembersKeysController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Update Chat Group Details
export const updateChatGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }
        if (!groupId || !Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID.' });
            return;
        }

        // 1. Permission Check: User must be an admin of the group
        const membership = await ChatGroupMembershipModel.findOne({ group: groupId, member: userId, isAdmin: true });
        if (!membership) {
            res.status(403).json({ status: false, message: 'You do not have permission to update this group.' });
            return;
        }

        // 2. Extract and validate payload
        const rawData = typeof req.body.groupData === 'string' ? JSON.parse(req.body.groupData) : req.body;
        const validation = validateUpdateGroupData(rawData);
        if (!validation.status) {
            res.status(400).json({ status: false, message: validation.message });
            return;
        }

        const payload = validation.data!;

        // 3. Handle Image Upload (optional)
        let icon: string | undefined;
        if ((req as any).file) {
            const localPath = (req as any).file.path as string;
            if (isCloudinaryConfigured()) {
                const uploaded = await uploadAndCleanup(localPath, { folder: 'konnect/groups' });
                if (uploaded.success && uploaded.secure_url) {
                    icon = uploaded.secure_url;
                } else {
                    console.warn('Cloudinary upload failed, using local path for icon.');
                    icon = localPath;
                }
            } else {
                icon = localPath;
            }
        }

        // 4. Update Chat Group basic details
        const updateFields: any = {
            name: payload.groupName,
            description: payload.description || '',
        };
        if (icon !== undefined) {
            updateFields.icon = icon;
        }

        const updatedGroup = await ChatGroupModel.findByIdAndUpdate(
            groupId,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedGroup) {
            res.status(404).json({ status: false, message: 'Chat group not found.' });
            return;
        }

        // 5. Handle Members and Admins update
        const incomingAdmins = payload.admins;
        const incomingMembers = payload.members.map(m => m.rollNumber);
        const allIncomingRolls = [...new Set([...incomingAdmins, ...incomingMembers])];

        const users = await userModel.find({ id: { $in: allIncomingRolls } }).select('_id id').lean();
        const newUserMap = new Map<string, Types.ObjectId>(users.map(u => [u.id, u._id]));

        const existingMemberships = await ChatGroupMembershipModel.find({ group: groupId }).populate('member', 'id').lean();
        
        // Use roll number (id) as key to avoid ObjectId comparison issues
        const existingMemberMap = new Map<string, { isAdmin: boolean, membershipId: Types.ObjectId }>(
            existingMemberships.map(m => [
                (m.member as any).id,
                { isAdmin: m.isAdmin, membershipId: m._id as Types.ObjectId }
            ])
        );

        const operations = [];

        for (const roll of allIncomingRolls) {
            const memberObjectId = newUserMap.get(roll);
            if (!memberObjectId) {
                console.warn(`Attempted to add non-existent user roll to chat group: ${roll}`);
                continue;
            }

            const isNewAdmin = incomingAdmins.includes(roll);
            const existingMember = existingMemberMap.get(roll);

            if (existingMember) {
                if (existingMember.isAdmin !== isNewAdmin) {
                    operations.push(
                        ChatGroupMembershipModel.updateOne(
                            { _id: existingMember.membershipId },
                            { $set: { isAdmin: isNewAdmin } }
                        )
                    );
                }
                // Mark as processed by removing from map
                existingMemberMap.delete(roll);
            } else {
                operations.push(
                    ChatGroupMembershipModel.create({
                        member: memberObjectId,
                        group: groupId,
                        isAdmin: isNewAdmin,
                    })
                );
            }
        }

        // Remove any members not present in the incoming list
        for (const [roll, info] of existingMemberMap.entries()) {
            operations.push(ChatGroupMembershipModel.deleteOne({ _id: info.membershipId }));
        }

        await Promise.all(operations);

        res.status(200).json({
            status: true,
            message: 'Chat group updated successfully.',
            data: {
                id: (updatedGroup._id as Types.ObjectId).toString(),
                name: updatedGroup.name,
                description: updatedGroup.description,
                icon: updatedGroup.icon,
            }
        });

    } catch (error) {
        console.error('Error in updateChatGroupController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Update Announcement Group Details
export const updateAnnouncementGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }
        if (!groupId || !Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID.' });
            return;
        }

        // 1. Permission Check: User must be an admin of the group
        const membership = await AnnouncementGroupMembershipModel.findOne({ group: groupId, member: userId, isAdmin: true });
        if (!membership) {
            res.status(403).json({ status: false, message: 'You do not have permission to update this group.' });
            return;
        }

        // 2. Extract and validate payload
        const rawData = typeof req.body.groupData === 'string' ? JSON.parse(req.body.groupData) : req.body;
        const validation = validateUpdateGroupData(rawData);
        if (!validation.status) {
            res.status(400).json({ status: false, message: validation.message });
            return;
        }

        const payload = validation.data!;

        // 3. Handle Image Upload (optional)
        let icon: string | undefined;
        if ((req as any).file) {
            const localPath = (req as any).file.path as string;
            if (isCloudinaryConfigured()) {
                const uploaded = await uploadAndCleanup(localPath, { folder: 'konnect/groups' });
                if (uploaded.success && uploaded.secure_url) {
                    icon = uploaded.secure_url;
                } else {
                    console.warn('Cloudinary upload failed, using local path for icon.');
                    icon = localPath;
                }
            } else {
                icon = localPath;
            }
        }

        // 4. Update Announcement Group basic details
        const updateFields: any = {
            name: payload.groupName,
            description: payload.description || '',
        };
        if (icon !== undefined) {
            updateFields.icon = icon;
        }

        const updatedGroup = await AnnouncementGroupModel.findByIdAndUpdate(
            groupId,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedGroup) {
            res.status(404).json({ status: false, message: 'Announcement group not found.' });
            return;
        }

        // 5. Handle Members and Admins update
        const incomingAdmins = payload.admins;
        const incomingMembers = payload.members.map(m => m.rollNumber);
        const allIncomingRolls = [...new Set([...incomingAdmins, ...incomingMembers])];

        const users = await userModel.find({ id: { $in: allIncomingRolls } }).select('_id id').lean();
        const newUserMap = new Map<string, Types.ObjectId>(users.map(u => [u.id, u._id]));

        const existingMemberships = await AnnouncementGroupMembershipModel.find({ group: groupId }).populate('member', 'id').lean();
        
        // Use roll number (id) as key to avoid ObjectId comparison issues
        const existingMemberMap = new Map<string, { isAdmin: boolean, membershipId: Types.ObjectId }>(
            existingMemberships.map(m => [
                (m.member as any).id,
                { isAdmin: m.isAdmin, membershipId: m._id as Types.ObjectId }
            ])
        );

        const operations = [];

        for (const roll of allIncomingRolls) {
            const memberObjectId = newUserMap.get(roll);
            if (!memberObjectId) {
                console.warn(`Attempted to add non-existent user roll to announcement group: ${roll}`);
                continue;
            }

            const isNewAdmin = incomingAdmins.includes(roll);
            const existingMember = existingMemberMap.get(roll);

            if (existingMember) {
                if (existingMember.isAdmin !== isNewAdmin) {
                    operations.push(
                        AnnouncementGroupMembershipModel.updateOne(
                            { _id: existingMember.membershipId },
                            { $set: { isAdmin: isNewAdmin } }
                        )
                    );
                }
                // Mark as processed by removing from map
                existingMemberMap.delete(roll);
            } else {
                operations.push(
                    AnnouncementGroupMembershipModel.create({
                        member: memberObjectId,
                        group: groupId,
                        isAdmin: isNewAdmin,
                    })
                );
            }
        }

        // Remove any members not present in the incoming list
        for (const [roll, info] of existingMemberMap.entries()) {
            operations.push(AnnouncementGroupMembershipModel.deleteOne({ _id: info.membershipId }));
        }

        await Promise.all(operations);

        res.status(200).json({
            status: true,
            message: 'Announcement group updated successfully.',
            data: {
                id: (updatedGroup._id as Types.ObjectId).toString(),
                name: updatedGroup.name,
                description: updatedGroup.description,
                icon: updatedGroup.icon,
            }
        });

    } catch (error) {
        console.error('Error in updateAnnouncementGroupController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Get chat groups the user is a member of
export const getMemberChatGroupsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        const groups = await getMemberChatGroups(userId);

        if (groups.length === 0) {
            res.status(200).json({
                status: true,
                message: 'User is not a member of any chat groups.',
                data: []
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Chat groups fetched successfully',
            data: groups
        });
    } catch (error) {
        console.error('Error in getMemberChatGroupsController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Get announcement groups the user is a member of
export const getMemberAnnouncementGroupsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        const groups = await getMemberAnnouncementGroups(userId);

        if (groups.length === 0) {
            res.status(200).json({
                status: true,
                message: 'User is not a member of any announcement groups.',
                data: []
            });
            return;
        }

        res.status(200).json({
            status: true,
            message: 'Announcement groups fetched successfully',
            data: groups
        });
    } catch (error) {
        console.error('Error in getMemberAnnouncementGroupsController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Check if user is admin of an Announcement Group
export const isGroupAdminAnnouncementController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        if (!groupId || !Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID format.' });
            return;
        }

        const membership = await AnnouncementGroupMembershipModel.findOne({
            group: groupId,
            member: userId,
            isAdmin: true
        }).lean();

        res.status(200).json({
            status: true,
            message: 'Admin status checked successfully.',
            data: {
                isAdmin: !!membership
            }
        });

    } catch (error) {
        console.error('Error in isUserAdminOfAnnouncementGroupController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

// Controller: Check if user is admin of a Chat Group
export const isUserAdminOfChatGroupController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ status: false, message: 'User authentication required.' });
            return;
        }

        if (!groupId || !Types.ObjectId.isValid(groupId)) {
            res.status(400).json({ status: false, message: 'Invalid group ID format.' });
            return;
        }

        const membership = await ChatGroupMembershipModel.findOne({
            group: groupId,
            member: userId,
            isAdmin: true
        }).lean();

        res.status(200).json({
            status: true,
            message: 'Admin status checked successfully.',
            data: {
                isAdmin: !!membership
            }
        });

    } catch (error) {
        console.error('Error in isUserAdminOfChatGroupController:', error);
        res.status(500).json({ status: false, message: 'An unexpected error occurred.' });
    }
};

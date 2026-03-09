import { Types } from 'mongoose';
import ChatGroupModel from '../models/chatGroup.model';
import AnnouncementGroupModel from '../models/announcementGroup.model';
import ChatGroupMembershipModel from '../models/chatGroupMembership.model';
import AnnouncementGroupMembershipModel from '../models/announcementGroupMembership.model';

export const getMemberChatGroups = async (userId: string | Types.ObjectId) => {
    const memberships = await ChatGroupMembershipModel.find({ member: userId }).select('group').lean();
    const groupIds = memberships.map(m => m.group);

    if (groupIds.length === 0) {
        return [];
    }

    const groups = await ChatGroupModel.find({ _id: { $in: groupIds } })
        .select('name description icon createdAt')
        .lean();

    const memberCounts = await ChatGroupMembershipModel.aggregate([
        { $match: { group: { $in: groupIds } } },
        { $group: { _id: '$group', count: { $sum: 1 } } }
    ]);
    const memberCountMap = new Map(memberCounts.map(c => [c._id.toString(), c.count]));

    const formattedGroups = groups.map(group => ({
        id: group._id.toString(),
        name: group.name,
        description: group.description || '',
        icon: group.icon || null,
        type: 'chat',
        memberCount: memberCountMap.get(group._id.toString()) || 0,
        createdAt: (group as any).createdAt
    })).sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());

    return formattedGroups;
};


export const getMemberAnnouncementGroups = async (userId: string | Types.ObjectId) => {
    const memberships = await AnnouncementGroupMembershipModel.find({ member: userId }).select('group').lean();
    const groupIds = memberships.map(m => m.group);

    if (groupIds.length === 0) {
        return [];
    }

    const groups = await AnnouncementGroupModel.find({ _id: { $in: groupIds } })
        .select('name description icon createdAt')
        .lean();

    const memberCounts = await AnnouncementGroupMembershipModel.aggregate([
        { $match: { group: { $in: groupIds } } },
        { $group: { _id: '$group', count: { $sum: 1 } } }
    ]);
    const memberCountMap = new Map(memberCounts.map(c => [c._id.toString(), c.count]));

    const formattedGroups = groups.map(group => ({
        id: group._id.toString(),
        name: group.name,
        description: group.description || '',
        icon: group.icon || null,
        type: 'announcement',
        memberCount: memberCountMap.get(group._id.toString()) || 0,
        createdAt: (group as any).createdAt
    })).sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());

    return formattedGroups;
};
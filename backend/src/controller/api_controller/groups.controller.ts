import { Request, Response } from 'express';
import { groupImageUpload } from '../../utils/multer.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';
import ChatGroupModel from '../../models/chatGroup.model';
import AnnouncementGroupModel from '../../models/announcementGroup.model';
import ChatGroupMembershipModel from '../../models/chatGroupMembership.model';
import AnnouncementGroupMembershipModel from '../../models/announcementGroupMembership.model';
import StudentModel from '../../models/Student.model';

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
        const results: Array<{ id: string; type: 'announcement' | 'chat'; name: string; description?: string; icon?: string; admins?: string[]; createdAt: Date; membersAdded: number }> = [];

        if (payload.isAnnouncementGroup) {
            const annDoc = await AnnouncementGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon,
                admin: payload.admins,
                adminType: 'admin' // since endpoint requires admin auth
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
                admins: annDoc.admin as string[],
                createdAt: annDoc.createdAt as Date,
                membersAdded
            });
        }

        if (payload.isChatGroup) {
            const chatDoc = await ChatGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon
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
            const chatDoc = await ChatGroupModel.create({
                name: payload.groupName,
                description: payload.description || '',
                icon
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
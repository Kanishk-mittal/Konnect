import { Request, Response } from 'express';
import { groupImageUpload } from '../../utils/multer.utils';
import { uploadAndCleanup, isCloudinaryConfigured } from '../../utils/cloudinary.utils';

// TODO: Import group models when they are created
// import ChatGroupModel from '../../models/chatGroup.model';
// import AnnouncementGroupModel from '../../models/announcementGroup.model';

// Export the configured multer upload for groups
export const upload = groupImageUpload;

// Controller functions will be added here as needed
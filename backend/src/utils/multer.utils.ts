import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Interface for upload configuration
interface UploadConfig {
    destination: string;
    filenamePrefix?: string;
    maxFileSize?: number;
    allowedMimeTypes?: string[];
}

// Default configurations for different upload types
export const uploadConfigs = {
    groups: {
        destination: 'uploads/groups',
        filenamePrefix: 'group',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    },
    profiles: {
        destination: 'uploads/profiles',
        filenamePrefix: 'profile',
        maxFileSize: 2 * 1024 * 1024, // 2MB
        allowedMimeTypes: ['image/jpeg', 'image/png']
    },
    documents: {
        destination: 'uploads/documents',
        filenamePrefix: 'doc',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['application/pdf', 'text/csv', 'application/vnd.ms-excel']
    }
};

// Create storage configuration
const createStorage = (config: UploadConfig) => {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = path.join(__dirname, '../../', config.destination);

            // Create directory if it doesn't exist
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }

            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            // Generate unique filename: prefix_timestamp_random.ext
            const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
            const prefix = config.filenamePrefix || 'file';
            const extension = path.extname(file.originalname);

            cb(null, `${prefix}_${uniqueSuffix}${extension}`);
        }
    });
};

// Create file filter
const createFileFilter = (allowedMimeTypes?: string[]) => {
    return (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
            // Allow all files if no restrictions
            cb(null, true);
            return;
        }

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`));
        }
    };
};

// Create multer instance with configuration
export const createMulterUpload = (config: UploadConfig) => {
    return multer({
        storage: createStorage(config),
        limits: {
            fileSize: config.maxFileSize || 5 * 1024 * 1024, // Default 5MB
        },
        fileFilter: createFileFilter(config.allowedMimeTypes)
    });
};

// Pre-configured multer instances for common use cases
export const groupImageUpload = createMulterUpload(uploadConfigs.groups);
export const profileImageUpload = createMulterUpload(uploadConfigs.profiles);
export const documentUpload = createMulterUpload(uploadConfigs.documents);

// Generic image upload (for any image type)
export const imageUpload = createMulterUpload({
    destination: 'uploads/images',
    filenamePrefix: 'img',
    maxFileSize: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
});

// Utility function to delete uploaded file
export const deleteUploadedFile = (filePath: string): boolean => {
    try {
        const fullPath = path.join(__dirname, '../../', filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};

// Utility function to get file info
export const getFileInfo = (file: Express.Multer.File) => {
    return {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`
    };
};

// Validate file size before upload
export const validateFileSize = (maxSize: number) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const contentLength = req.headers['content-length'];

        if (contentLength && parseInt(contentLength) > maxSize) {
            res.status(400).json({
                success: false,
                message: `File size too large. Maximum allowed: ${maxSize / (1024 * 1024)}MB`
            });
            return;
        }

        next();
    };
};

// Error handler for multer errors
export const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction): void => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                res.status(400).json({
                    success: false,
                    message: 'File size too large'
                });
                return;
            case 'LIMIT_FILE_COUNT':
                res.status(400).json({
                    success: false,
                    message: 'Too many files'
                });
                return;
            case 'LIMIT_UNEXPECTED_FILE':
                res.status(400).json({
                    success: false,
                    message: 'Unexpected file field'
                });
                return;
            default:
                res.status(400).json({
                    success: false,
                    message: 'File upload error'
                });
                return;
        }
    }

    if (error.message.includes('File type not allowed')) {
        res.status(400).json({
            success: false,
            message: error.message
        });
        return;
    }

    next(error);
};
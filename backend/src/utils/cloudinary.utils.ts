import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

// Initialize Cloudinary configuration
export const initializeCloudinary = (): void => {
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if (cloudinaryUrl) {
        // Configure using CLOUDINARY_URL (recommended approach)
        cloudinary.config(cloudinaryUrl);
        console.log('☁️ Cloudinary initialized successfully with CLOUDINARY_URL');
    } else {
        // Fallback to individual environment variables
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (cloudName && apiKey && apiSecret) {
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
            console.log('☁️ Cloudinary initialized successfully with individual env vars');
        } else {
            console.warn('⚠️ Cloudinary configuration incomplete. Please set either:');
            console.warn('   - CLOUDINARY_URL (recommended), or');
            console.warn('   - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
        }
    }
};

// Interface for upload options
interface CloudinaryUploadOptions {
    folder?: string;
    public_id?: string;
    transformation?: any[];
    resource_type?: 'image' | 'video' | 'raw' | 'auto';
    format?: string;
    quality?: 'auto' | number;
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'scale' | 'crop' | 'thumb' | 'pad';
}

// Interface for upload result
interface CloudinaryUploadResult {
    success: boolean;
    url?: string;
    secure_url?: string;
    public_id?: string;
    resource_type?: string;
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
    error?: string;
}

// Upload file to Cloudinary
export const uploadToCloudinary = async (
    filePath: string,
    options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> => {
    try {
        const defaultOptions = {
            resource_type: 'auto' as const,
            quality: 'auto' as const,
            folder: 'konnect'
        };

        const uploadOptions = { ...defaultOptions, ...options };

        const result = await cloudinary.uploader.upload(filePath, uploadOptions);

        return {
            success: true,
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes
        };
    } catch (error) {
        console.error('❌ Cloudinary upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown upload error'
        };
    }
};

// Upload multiple files to Cloudinary
export const uploadMultipleToCloudinary = async (
    filePaths: string[],
    options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult[]> => {
    const uploadPromises = filePaths.map(filePath => uploadToCloudinary(filePath, options));
    return Promise.all(uploadPromises);
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            return { success: true };
        } else {
            return { success: false, error: 'Failed to delete file' };
        }
    } catch (error) {
        console.error('❌ Cloudinary delete error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown delete error'
        };
    }
};

// Upload and delete local file
export const uploadAndCleanup = async (
    localFilePath: string,
    options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> => {
    try {
        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(localFilePath, options);

        // Delete local file after successful upload
        if (uploadResult.success && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return uploadResult;
    } catch (error) {
        console.error('❌ Upload and cleanup error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

// Generate transformation URL
export const generateTransformationUrl = (
    publicId: string,
    transformations: any[] = []
): string => {
    try {
        return cloudinary.url(publicId, {
            transformation: transformations
        });
    } catch (error) {
        console.error('❌ Error generating transformation URL:', error);
        return '';
    }
};

// Pre-defined transformation presets
export const transformationPresets = {
    profileImage: [
        { width: 300, height: 300, crop: 'fill' },
        { quality: 'auto', format: 'auto' }
    ],
    groupImage: [
        { width: 500, height: 500, crop: 'fill' },
        { quality: 'auto', format: 'auto' }
    ],
    thumbnail: [
        { width: 150, height: 150, crop: 'fill' },
        { quality: 'auto', format: 'auto' }
    ],
    banner: [
        { width: 1200, height: 400, crop: 'fill' },
        { quality: 'auto', format: 'auto' }
    ]
};

// Upload with preset transformations
export const uploadWithPreset = async (
    filePath: string,
    preset: keyof typeof transformationPresets,
    folder: string = 'konnect'
): Promise<CloudinaryUploadResult> => {
    const options: CloudinaryUploadOptions = {
        folder,
        transformation: transformationPresets[preset]
    };

    return uploadToCloudinary(filePath, options);
};

// Middleware to upload file to Cloudinary after multer
export const cloudinaryUploadMiddleware = (
    options: CloudinaryUploadOptions = {},
    deleteLocal: boolean = true
) => {
    return async (req: Request, res: Response, next: any): Promise<void> => {
        try {
            if (!req.file) {
                next();
                return;
            }

            const uploadResult = await uploadToCloudinary(req.file.path, options);

            if (uploadResult.success) {
                // Add Cloudinary info to request object
                (req as any).cloudinary = uploadResult;

                // Delete local file if requested
                if (deleteLocal && fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to upload image to cloud storage',
                    error: uploadResult.error
                });
                return;
            }

            next();
        } catch (error) {
            console.error('❌ Cloudinary middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Cloud storage error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
};

// Get optimized image URL
export const getOptimizedImageUrl = (
    publicId: string,
    width?: number,
    height?: number,
    quality: 'auto' | number = 'auto'
): string => {
    const transformations = [];

    if (width || height) {
        transformations.push({
            width,
            height,
            crop: 'fill'
        });
    }

    transformations.push({
        quality,
        format: 'auto'
    });

    return generateTransformationUrl(publicId, transformations);
};

// Check if Cloudinary is configured
export const isCloudinaryConfigured = (): boolean => {
    // Check if CLOUDINARY_URL is set (preferred method)
    if (process.env.CLOUDINARY_URL) {
        return true;
    }

    // Fallback: check individual environment variables
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

// Get Cloudinary configuration status
export const getCloudinaryStatus = () => {
    const hasUrl = !!process.env.CLOUDINARY_URL;
    const hasIndividualVars = !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );

    return {
        configured: hasUrl || hasIndividualVars,
        method: hasUrl ? 'CLOUDINARY_URL' : hasIndividualVars ? 'Individual Variables' : 'Not Configured',
        cloudinary_url: process.env.CLOUDINARY_URL ? '✓ Set' : '✗ Missing',
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Missing',
        api_key: process.env.CLOUDINARY_API_KEY ? '✓ Set' : '✗ Missing',
        api_secret: process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Missing'
    };
};
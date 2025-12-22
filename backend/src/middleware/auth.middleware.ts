import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret, refreshJwt } from '../utils/jwt/jwt.utils';

// Extend Request interface to include user payload
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                type: string;
                iat?: number;
                exp?: number;
            };
        }
    }
}

/**
 * Authentication middleware that validates JWT tokens and refreshes them
 * @param req Express request object
 * @param res Express response object
 * @param next Next function to continue middleware chain
 */
export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const cookieName = 'auth_token';
    const expiresIn = 30 * 24 * 60 * 60; // 1 month in seconds

    try {
        const token = req.cookies?.[cookieName];

        if (!token) {
            res.status(401).json({
                status: false,
                message: 'Access denied. No token provided.'
            });
            return;
        }

        const secret = getJwtSecret();

        // Verify the token
        const decoded = jwt.verify(token, secret) as {
            id: string;
            type: string;
            iat?: number;
            exp?: number;
        };

        // Add user payload to request
        req.user = {
            id: decoded.id,
            type: decoded.type,
            ...(decoded.iat && { iat: decoded.iat }),
            ...(decoded.exp && { exp: decoded.exp })
        };

        // Refresh the JWT token
        const refreshed = refreshJwt(req, res, cookieName, expiresIn);

        if (!refreshed) {
            res.status(401).json({
                status: false,
                message: 'Failed to refresh token. Please log in again.'
            });
            return;
        }

        // Continue to next middleware
        next();

    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                status: false,
                message: 'Token has expired. Please log in again.'
            });
            return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                status: false,
                message: 'Invalid token. Please log in again.'
            });
            return;
        }

        console.error('Authentication error:', error);
        res.status(500).json({
            status: false,
            message: 'An error occurred during authentication.'
        });
    }
};

/**
 * Middleware to check if user is an admin
 * Should be used after authMiddleware
 */
export const adminAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            status: false,
            message: 'Authentication required.'
        });
        return;
    }

    if (req.user.type !== 'admin') {
        res.status(403).json({
            status: false,
            message: 'Admin access required.'
        });
        return;
    }

    next();
};

/**
 * Middleware to check if user is a student
 * Should be used after authMiddleware
 */
export const studentAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            status: false,
            message: 'Authentication required.'
        });
        return;
    }

    if (req.user.type !== 'student') {
        res.status(403).json({
            status: false,
            message: 'Student access required.'
        });
        return;
    }

    next();
};

/**
 * Middleware to check if user is a club
 * Should be used after authMiddleware
 */
export const clubAuthMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            status: false,
            message: 'Authentication required.'
        });
        return;
    }

    if (req.user.type !== 'club') {
        res.status(403).json({
            status: false,
            message: 'Club access required.'
        });
        return;
    }

    next();
};

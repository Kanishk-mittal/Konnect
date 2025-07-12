import jwt, { SignOptions } from 'jsonwebtoken';
import { Response, Request } from 'express';

// Loads JWT secret from environment variable
export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return secret;
}

/**
 * Generates a JWT token and sets it as a cookie in the response
 * @param res Express response object
 * @param payload Object to encode in JWT (TODO: Define payload type/interface)
 * @param cookieName Name of the cookie to set
 * @param expiresIn Expiry duration (in seconds)
 */
export function setJwtCookie(
    res: Response,
    payload: object, // TODO: Define payload type/interface
    cookieName: string,
    expiresIn: number // expiresIn should be a number (in seconds)
): void {
    const secret = getJwtSecret();
    const token = jwt.sign(payload, secret, { expiresIn });
    const mode = process.env.NODE_ENV || 'development';
    res.cookie(cookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: mode === 'production',
        maxAge: expiresIn * 1000, // convert seconds to ms for cookie
    });
}

/**
 * Verifies a JWT token from the request cookies and returns true if valid, false otherwise
 * @param req Express request object
 * @param cookieName Name of the cookie to check
 */
export const verifyJwt = (req: Request, cookieName: string): boolean => {
    const secret = getJwtSecret();
    const token = req.cookies?.[cookieName];
    if (!token) return false;
    try {
        jwt.verify(token, secret);
        return true;
    } catch {
        return false;
    }
};

/**
 * Refreshes a JWT token by verifying and re-issuing it with a new expiry
 * @param req Express request object
 * @param res Express response object
 * @param cookieName Name of the cookie to set
 * @param expiresIn Expiry duration (in seconds)
 * @returns boolean true if refreshed, false if invalid
 */
export const refreshJwt = (
    req: Request,
    res: Response,
    cookieName: string,
    expiresIn: number
): boolean => {
    if (!verifyJwt(req, cookieName)) return false;
    const secret = getJwtSecret();
    const oldToken = req.cookies?.[cookieName];
    try {
        const payload = jwt.verify(oldToken, secret) as object; // TODO: Define payload type/interface
        // Remove iat, exp from payload if present
        const { iat, exp, ...rest } = payload as any;
        const newToken = jwt.sign(rest, secret, { expiresIn });
        const mode = process.env.NODE_ENV || 'development';
        res.cookie(cookieName, newToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: mode === 'production',
            maxAge: expiresIn * 1000,
        });
        return true;
    } catch {
        return false;
    }
};

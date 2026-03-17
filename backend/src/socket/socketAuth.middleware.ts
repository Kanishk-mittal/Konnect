import { Socket } from "socket.io";
import { CustomSocket } from "./socketHandler";
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwt/jwt.utils';
import cookie from 'cookie';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
    const cookieName = 'auth_token';

    try {
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const token = cookies[cookieName];

        if (!token) {
            return next(new Error('Authentication error: No token provided.'));
        }

        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret) as { id: string; type: string };

        (socket as CustomSocket).userId = decoded.id;
        next();

    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new Error('Authentication error: Token has expired.'));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new Error('Authentication error: Invalid token.'));
        }
        console.error('Socket authentication error:', error);
        return next(new Error('Authentication error: An unexpected error occurred.'));
    }
};

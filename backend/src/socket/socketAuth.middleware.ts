import { Socket } from "socket.io";
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/jwt/jwt.utils';
import * as cookie from 'cookie';
import { userSocketMap } from "./userSocketMap";

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

        // Add user to the socket map
        userSocketMap.add(socket.id, decoded.id);

        // Join the user to a room named after their user ID - REMOVED as it's redundant with the new userSocketMap
        // socket.join(decoded.id);
        next();

    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return next(new Error('Authentication error: Token has expired.'));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new Error('Authentication error: Invalid token.'));
        }
        return next(new Error('Authentication error: An unexpected error occurred.'));
    }
};

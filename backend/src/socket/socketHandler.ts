import {
    Server as SocketIOServer,
    Socket
} from 'socket.io';
import { Server } from 'http';
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from './socketTypes';
import { socketAuthMiddleware } from './socketAuth.middleware';

export class SocketHandler {
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents>;

    constructor(server: Server) {
        this.io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents>(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: process.env.SOCKET_PING_TIMEOUT ? parseInt(process.env.SOCKET_PING_TIMEOUT) : 60000,
            pingInterval: process.env.SOCKET_PING_INTERVAL ? parseInt(process.env.SOCKET_PING_INTERVAL) : 25000,
        });

        this.io.use(socketAuthMiddleware);
        this.initializeSocketEvents();
    }

    private initializeSocketEvents(): void {
        this.io.on('connection', (socket: Socket) => {
            const userId = [...socket.rooms].find(room => room !== socket.id);
        });
    }

    // Method to emit to specific user
    public emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
        this.io.to(userId).emit(event, data);
    }

    // Method to emit to specific group
    public emitToGroup(groupId: string, event: keyof ServerToClientEvents, data: any): void {
        this.io.to(`group_${groupId}`).emit(event, data);
    }

    // Method to get connected users with their info
    public getConnectedUsersInfo(): Array<{ socketId: string, userId: string }> {
        const authenticatedSockets = new Map<string, string>(); // Map<socketId, userId>

        const rooms = this.io.of("/").adapter.rooms;
        const sids = this.io.of("/").adapter.sids;

        sids.forEach((roomsForSocket, socketId) => {
            // Find the room that is the user's ID.
            // A socket is always in a room with its own ID, so we look for a second room.
            const userRoom = [...roomsForSocket].find(room => room !== socketId);
            if (userRoom) {
                // We check if the found room is a user room (not a group room)
                // A simple check is to see if it exists in the sids map as a key. If it does, it's a socket id, not a user id room.
                // A more robust check might be needed if user IDs can look like socket IDs.
                if (!sids.has(userRoom)) {
                    authenticatedSockets.set(socketId, userRoom);
                }
            }
        });

        return Array.from(authenticatedSockets.entries()).map(([socketId, userId]) => ({ socketId, userId }));
    }

    // Get Socket.IO instance
    public getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents> {
        return this.io;
    }
}

import {
    Server as SocketIOServer,
    Socket
 } from 'socket.io';
import { Server } from 'http';
import {
    joinController
} from "../controller/socket_controller/connection";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from './socketTypes';

export interface CustomSocket extends Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
    userId?: string;
    username?: string;
}

export class SocketHandler {
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
    public connectedUsers: CustomSocket[] = new Array<CustomSocket>();

    constructor(server: Server) {
        this.io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: process.env.SOCKET_PING_TIMEOUT ? parseInt(process.env.SOCKET_PING_TIMEOUT) : 60000,
            pingInterval: process.env.SOCKET_PING_INTERVAL ? parseInt(process.env.SOCKET_PING_INTERVAL) : 25000,
        });

        this.initializeSocketEvents();
    }

    private initializeSocketEvents(): void {
        this.io.on('connection', (socket: CustomSocket) => {
            console.log(`✅ User connected: ${socket.id}`);
            // Add the socket to connected users
            this.connectedUsers.push(socket);

            // Handle user joining
            socket.on('join', (data: { userId: string; username: string }) => joinController(socket, data));

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`❌ User disconnected: ${socket.id}`);
                
                // Remove from connected users array
                this.connectedUsers = this.connectedUsers.filter(s => s.id !== socket.id);
            });
        });
    }

    // Method to emit to specific user
    public emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
        this.io.to(`user_${userId}`).emit(event, data);
    }

    // Method to emit to specific group
    public emitToGroup(groupId: string, event: keyof ServerToClientEvents, data: any): void {
        this.io.to(`group_${groupId}`).emit(event, data);
    }

    // Method to get all connected users
    public getConnectedUsers(): string[] {
        return this.connectedUsers.map(socket => socket.id);
    }

    // Method to get connected users with their info
    public getConnectedUsersInfo(): Array<{socketId: string, userId: string | undefined, username: string | undefined}> {
        return this.connectedUsers.map(socket => ({
            socketId: socket.id,
            userId: socket.userId,
            username: socket.username
        }));
    }

    // Get Socket.IO instance
    public getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
        return this.io;
    }
}

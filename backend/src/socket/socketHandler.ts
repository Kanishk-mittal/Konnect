import {
    Server as SocketIOServer,
    Socket
} from 'socket.io';
import { Server } from 'http';
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents } from './socketTypes';
import { socketAuthMiddleware } from './socketAuth.middleware';
import { userSocketMap } from './userSocketMap';
import User from '../models/user.model';
import ChatGroupMembership from '../models/chatGroupMembership.model';
import AnnouncementGroupMembership from '../models/announcementGroupMembership.model';


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
            // TODO: Remove console.log for socket connection
            console.log(`Socket connected: ${socket.id}`);

            socket.on('private_message', async (data) => {
                const { receiver, message, groupId } = data;
                const senderId = userSocketMap.getUserId(socket.id);

                if (!senderId) {
                    // TODO: Remove console.log for private_message no sender
                    console.log(`Could not find sender for socket ${socket.id}`);
                    return; // Sender not found in map, drop message
                }

                try {
                    // Fetch sender and receiver user documents
                    const senderUser = await User.findOne({ id: senderId }).lean();
                    const receiverUser = await User.findOne({ id: receiver }).lean();

                    if (!senderUser || !receiverUser) {
                        // TODO: Remove console.log for private_message user not found
                        console.log(`Sender or receiver not found in DB. Sender: ${senderId}, Receiver: ${receiver}`);
                        return; // User not found, drop message
                    }

                    // 1. Check for same college
                    if (senderUser.college_code !== receiverUser.college_code) {
                        // TODO: Remove console.log for private_message different college
                        console.log(`Message dropped: Sender and receiver in different colleges.`);
                        return;
                    }

                    // 2. Check if sender is blocked by receiver
                    if (receiverUser.blocked_users?.some(blockedId => blockedId.equals(senderUser._id))) {
                        // TODO: Remove console.log for private_message sender blocked
                        console.log(`Message dropped: Sender ${senderId} is blocked by receiver ${receiver}.`);
                        return;
                    }

                    // 3. If groupId is provided, check for group membership
                    if (groupId) {
                        const isChatGroupMember = await ChatGroupMembership.countDocuments({
                            group: groupId,
                            member: { $in: [senderUser._id, receiverUser._id] }
                        });

                        const isAnnouncementGroupMember = await AnnouncementGroupMembership.countDocuments({
                            group: groupId,
                            member: { $in: [senderUser._id, receiverUser._id] }
                        });

                        if (isChatGroupMember < 2 && isAnnouncementGroupMember < 2) {
                            // TODO: Remove console.log for private_message not group members
                            console.log(`Message dropped: Not all users are members of group ${groupId}.`);
                            return; // Not all users are members of the group
                        }
                    }

                    // All checks passed, forward the message
                    const receiverSocketId = userSocketMap.getSocketId(receiver);
                    if (receiverSocketId) {
                        const payload = { sender: senderId, message, groupId };
                        this.io.to(receiverSocketId).emit('new_message', payload);
                        // TODO: Remove console.log for private_message success
                        console.log(`Message from ${senderId} to ${receiver} sent successfully.`);
                    } else {
                        // TODO: Remove console.log for private_message receiver offline
                        console.log(`Receiver ${receiver} is not online. Message not sent.`);
                    }

                } catch (error) {
                    // TODO: Remove console.log for private_message error
                    console.error('Error handling private_message:', error);
                }
            });


            socket.on('disconnect', () => {
                // TODO: Remove console.log for socket disconnection
                console.log(`Socket disconnected: ${socket.id}`);
                userSocketMap.remove(socket.id);
            });
        });
    }

    // Method to emit to specific user
    public emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
        const socketId = userSocketMap.getSocketId(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
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

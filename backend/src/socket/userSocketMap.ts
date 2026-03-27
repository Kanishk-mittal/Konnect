
class UserSocketMap {
    private socketToUserMap: Map<string, string>;
    private userToSocketMap: Map<string, string>;

    constructor() {
        this.socketToUserMap = new Map();
        this.userToSocketMap = new Map();
    }

    /**
     * Adds a new bidirectional mapping between a socket ID and a user ID.
     * @param socketId The ID of the socket.
     * @param userId The ID of the user.
     */
    add(socketId: string, userId: string): void {
        this.socketToUserMap.set(socketId, userId);
        this.userToSocketMap.set(userId, socketId);
    }

    /**
     * Removes mappings using the socket ID.
     * @param socketId The ID of the socket to remove.
     */
    remove(socketId: string): void {
        const userId = this.socketToUserMap.get(socketId);
        if (userId) {
            this.socketToUserMap.delete(socketId);
            this.userToSocketMap.delete(userId);
        } else {
        }
    }

    /**
     * Retrieves the user ID associated with a given socket ID.
     * @param socketId The ID of the socket.
     * @returns The user ID, or undefined if not found.
     */
    getUserId(socketId: string): string | undefined {
        return this.socketToUserMap.get(socketId);
    }

    /**
     * Retrieves the socket ID associated with a given user ID.
     * @param userId The ID of the user.
     * @returns The socket ID, or undefined if not found.
     */
    getSocketId(userId: string): string | undefined {
        return this.userToSocketMap.get(userId);
    }
}

export const userSocketMap = new UserSocketMap();

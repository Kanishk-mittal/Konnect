
class UserSocketMap {
    private socketToUserMap: Map<string, string>;
    private userToSocketMap: Map<string, string>;

    constructor() {
        this.socketToUserMap = new Map();
        this.userToSocketMap = new Map();
        // TODO: Remove console.log for UserSocketMap initialization
        console.log("UserSocketMap initialized");
    }

    /**
     * Adds a new bidirectional mapping between a socket ID and a user ID.
     * @param socketId The ID of the socket.
     * @param userId The ID of the user.
     */
    add(socketId: string, userId: string): void {
        this.socketToUserMap.set(socketId, userId);
        this.userToSocketMap.set(userId, socketId);
        // TODO: Remove console.log for UserSocketMap add
        console.log(`UserSocketMap: Added socket ${socketId} for user ${userId}`);
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
            // TODO: Remove console.log for UserSocketMap remove
            console.log(`UserSocketMap: Removed socket ${socketId} for user ${userId}`);
        } else {
            // TODO: Remove console.log for UserSocketMap remove (socket not found)
            console.log(`UserSocketMap: Attempted to remove socket ${socketId}, but not found.`);
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

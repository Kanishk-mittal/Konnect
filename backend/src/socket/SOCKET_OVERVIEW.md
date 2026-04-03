# Socket Implementation Overview

This directory contains the real-time communication logic for Konnect, powered by Socket.IO.

## Core Components

### 1. `socketTypes.ts`
Defines the TypeScript interfaces for all socket events.
- **`ServerToClientEvents`**: Events emitted by the server (e.g., `new_message`, `connected`).
- **`ClientToServerEvents`**: Events sent by the client (e.g., `private_message`).
- **`InterServerEvents`**: Events for server-to-server communication (e.g., `ping`).

### 2. `userSocketMap.ts`
A utility class that maintains a bidirectional mapping between `socketId` and `userId`.
- This allows the server to quickly find which socket belongs to which user and vice-versa.
- It is updated automatically on connection and disconnection.

### 3. `socketAuth.middleware.ts`
Middleware that secures the socket connection.
- Validates the `auth_token` JWT provided in the handshake cookies.
- Rejects unauthorized connections.
- Automatically registers the user in the `userSocketMap` upon successful authentication.

### 4. `socketHandler.ts`
The main controller for socket logic.
- Initializes the Socket.IO server with CORS and timeout configurations.
- Handles the `connection` and `disconnect` events.
- **`private_message` Handler**: Contains the core logic for routing messages. It performs security checks (same college, block list, group membership) before forwarding a message.
- Provides utility methods like `emitToUser` and `emitToGroup`.

### 5. `socketService.ts`
A singleton service that provides a global access point to the `SocketHandler`.
- Other backend services can use `SocketService.emitToUser()` or `SocketService.emitToGroup()` to trigger real-time updates from anywhere in the codebase.

## Message Flow
1. **Connection**: Client connects -> `socketAuthMiddleware` verifies token -> User added to `userSocketMap`.
2. **Sending**: Client emits `private_message`.
3. **Validation**: `SocketHandler` validates sender/receiver relationship (College, Blocked status, Group membership).
4. **Delivery**: If valid, server emits `new_message` to the receiver's specific `socketId`.
5. **Disconnection**: Client disconnects -> User removed from `userSocketMap`.

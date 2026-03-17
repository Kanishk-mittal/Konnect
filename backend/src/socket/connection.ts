import { CustomSocket } from "./socketHandler"

export const joinController = (socket: CustomSocket, data: { userId: string; username: string }): void => { 
    socket.userId = data.userId;
    socket.username = data.username;
    socket.join(`user_${data.userId}`);

    console.log(`👤 User ${data.username} (${data.userId}) joined`);
}
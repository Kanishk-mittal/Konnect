import { io } from 'socket.io-client';

// The backend URL should be stored in an environment variable
const URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000';

export const socket = io(URL, {
    autoConnect: false, // We will connect manually
    withCredentials: true // This is crucial for sending the auth cookie
});

export const connectSocket = () => {
    if (socket.disconnected) {
        socket.connect();
    }
};

export const disconnectSocket = () => {
    if (socket.connected) {
        socket.disconnect();
    }
};

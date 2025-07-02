// Socket.IO Event Types for Konnect

export interface ServerToClientEvents {
  // Connection events
  connected: (data: { message: string; userId: string; socketId: string }) => void;
}

export interface ClientToServerEvents {
  // Connection events
  join: (data: { userId: string; username: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  username: string;
}

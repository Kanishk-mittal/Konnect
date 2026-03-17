// Socket.IO Event Types for Konnect

export interface ServerToClientEvents {
  // Connection events
  connected: (data: { message: string; userId: string; socketId: string }) => void;
}

export interface ClientToServerEvents {
  // No client-to-server events are defined for now beyond the default ones.
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
}

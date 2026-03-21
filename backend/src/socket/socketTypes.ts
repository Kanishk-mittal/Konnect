// Socket.IO Event Types for Konnect

export interface ServerToClientEvents {
  // Connection events
  connected: (data: { message: string; userId: string; socketId: string }) => void;
  new_message: (data: { sender: string; message: string; groupId?: string }) => void;
}

export interface ClientToServerEvents {
  private_message: (data: { receiver: string; message: string; groupId?: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

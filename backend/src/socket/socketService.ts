import { SocketHandler } from './socketHandler';
import { ServerToClientEvents } from './socketTypes';

class SocketService {
  private static instance: SocketService;
  private socketHandler: SocketHandler | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public setSocketHandler(socketHandler: SocketHandler): void {
    this.socketHandler = socketHandler;
  }

  public getSocketHandler(): SocketHandler | null {
    return this.socketHandler;
  }

  // Convenience methods
  public emitToUser(userId: string, event: keyof ServerToClientEvents, data: any): void {
    if (this.socketHandler) {
      this.socketHandler.emitToUser(userId, event, data);
    }
  }

  public emitToGroup(groupId: string, event: keyof ServerToClientEvents, data: any): void {
    if (this.socketHandler) {
      this.socketHandler.emitToGroup(groupId, event, data);
    }
  }

  public async getConnectedUsers(): Promise<string[]> {
    if (this.socketHandler) {
      return this.socketHandler.getConnectedUsers();
    }
    return [];
  }
}

export default SocketService.getInstance();

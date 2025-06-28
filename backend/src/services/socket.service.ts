import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          Logger.warn('Socket connection attempted without token');
          return next(new Error('Authentication error: No token provided'));
        }

        const jwtSecret = process.env['JWT_SECRET'] || 'your-jwt-secret';
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        socket.userId = decoded.userId || decoded.id;
        socket.username = decoded.username;
        
        Logger.info(`Socket authenticated for user: ${socket.username} (${socket.userId})`);
        next();
      } catch (error) {
        Logger.warn('Socket authentication failed:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const username = socket.username!;

    Logger.info(`User connected: ${username} (${userId})`);

    // Store connected user
    this.connectedUsers.set(userId, socket);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Notify user is online
    this.broadcastUserStatus(userId, username, 'online');

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle user presence updates
    socket.on('user:status', (status: string) => {
      this.handleUserStatus(socket, status);
    });

    // Handle leaderboard subscriptions
    socket.on('leaderboard:subscribe', (leaderboardId: string) => {
      this.handleLeaderboardSubscription(socket, leaderboardId);
    });

    socket.on('leaderboard:unsubscribe', (leaderboardId: string) => {
      this.handleLeaderboardUnsubscription(socket, leaderboardId);
    });

    // Handle achievement sharing
    socket.on('achievement:share', (achievementData: any) => {
      this.handleAchievementShare(socket, achievementData);
    });

    // Handle friend requests
    socket.on('friend:request', (targetUserId: string) => {
      this.handleFriendRequest(socket, targetUserId);
    });

    // Handle typing indicators for comments
    socket.on('typing:start', (data: { postId: string }) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing:stop', (data: { postId: string }) => {
      this.handleTypingStop(socket, data);
    });

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Unplug social features',
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const username = socket.username!;

    Logger.info(`User disconnected: ${username} (${userId})`);

    // Remove from connected users
    this.connectedUsers.delete(userId);

    // Notify user is offline
    this.broadcastUserStatus(userId, username, 'offline');
  }

  private handleUserStatus(socket: AuthenticatedSocket, status: string): void {
    const userId = socket.userId!;
    const username = socket.username!;

    Logger.debug(`User status update: ${username} -> ${status}`);
    this.broadcastUserStatus(userId, username, status);
  }

  private handleLeaderboardSubscription(socket: AuthenticatedSocket, leaderboardId: string): void {
    const roomName = `leaderboard:${leaderboardId}`;
    socket.join(roomName);
    
    Logger.debug(`User ${socket.username} subscribed to leaderboard: ${leaderboardId}`);
    
    socket.emit('leaderboard:subscribed', {
      leaderboardId,
      message: 'Subscribed to leaderboard updates',
    });
  }

  private handleLeaderboardUnsubscription(socket: AuthenticatedSocket, leaderboardId: string): void {
    const roomName = `leaderboard:${leaderboardId}`;
    socket.leave(roomName);
    
    Logger.debug(`User ${socket.username} unsubscribed from leaderboard: ${leaderboardId}`);
  }

  private handleAchievementShare(socket: AuthenticatedSocket, achievementData: any): void {
    const userId = socket.userId!;
    const username = socket.username!;

    Logger.info(`Achievement shared by ${username}: ${achievementData.title}`);

    // Broadcast to all connected users except sender
    socket.broadcast.emit('achievement:shared', {
      userId,
      username,
      achievement: achievementData,
      timestamp: new Date().toISOString(),
    });
  }

  private handleFriendRequest(socket: AuthenticatedSocket, targetUserId: string): void {
    const senderId = socket.userId!;
    const senderUsername = socket.username!;

    Logger.info(`Friend request from ${senderUsername} to user ${targetUserId}`);

    // Send notification to target user if they're online
    this.sendToUser(targetUserId, 'friend:request', {
      senderId,
      senderUsername,
      message: `${senderUsername} sent you a friend request`,
      timestamp: new Date().toISOString(),
    });
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: { postId: string }): void {
    const userId = socket.userId!;
    const username = socket.username!;

    // Broadcast typing indicator to others viewing the same post
    socket.broadcast.to(`post:${data.postId}`).emit('typing:start', {
      userId,
      username,
      postId: data.postId,
    });
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: { postId: string }): void {
    const userId = socket.userId!;
    const username = socket.username!;

    // Broadcast typing stop to others viewing the same post
    socket.broadcast.to(`post:${data.postId}`).emit('typing:stop', {
      userId,
      username,
      postId: data.postId,
    });
  }

  private broadcastUserStatus(userId: string, username: string, status: string): void {
    this.io.emit('user:status', {
      userId,
      username,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Public methods for other services to use

  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public broadcastToLeaderboard(leaderboardId: string, event: string, data: any): void {
    this.io.to(`leaderboard:${leaderboardId}`).emit(event, data);
  }

  public broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Notification methods
  public sendNotification(userId: string, notification: any): void {
    this.sendToUser(userId, 'notification:new', notification);
  }

  public broadcastLeaderboardUpdate(leaderboardId: string, update: any): void {
    this.broadcastToLeaderboard(leaderboardId, 'leaderboard:updated', update);
  }

  public broadcastAchievementShare(achievement: any): void {
    this.broadcastToAll('achievement:shared', achievement);
  }
}

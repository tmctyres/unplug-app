/**
 * Authentication Service
 * Handles user authentication, JWT tokens, and session management
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';
import { Logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}

export interface SocialProfile {
  userId: string;
  showInLeaderboards: boolean;
  allowFriendRequests: boolean;
  shareAchievements: boolean;
  shareProgress: boolean;
  friendsCount: number;
  circlesCount: number;
  achievementsShared: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  private static instance: AuthService;
  private db: DatabaseService;
  private redis: RedisService;
  private logger: typeof Logger;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.redis = RedisService.getInstance();
    this.logger = Logger;
    
    this.jwtSecret = process.env['JWT_SECRET'] || 'your-jwt-secret';
    this.jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret';
    this.accessTokenExpiry = process.env['JWT_EXPIRY'] || '15m';
    this.refreshTokenExpiry = process.env['JWT_REFRESH_EXPIRY'] || '7d';
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initialize(): Promise<void> {
    this.logger.info('Authentication service initialized');
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Check if user already exists
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser) {
        throw new AppError('User already exists with this email', 409);
      }

      const existingUsername = await this.findUserByUsername(userData.username);
      if (existingUsername) {
        throw new AppError('Username is already taken', 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const userId = uuidv4();
      const now = new Date();

      const user: User = {
        id: userId,
        username: userData.username.toLowerCase(),
        email: userData.email.toLowerCase(),
        displayName: userData.displayName,
        isVerified: false,
        isPublic: true,
        createdAt: now,
        updatedAt: now,
        lastActive: now
      };

      // Insert user into database
      await this.db.query(`
        INSERT INTO users (id, username, email, display_name, password_hash, is_verified, is_public, created_at, updated_at, last_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [userId, user.username, user.email, user.displayName, hashedPassword, user.isVerified, user.isPublic, user.createdAt, user.updatedAt, user.lastActive]);

      // Create social profile
      await this.createSocialProfile(userId);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Store refresh token
      await this.storeRefreshToken(userId, tokens.refreshToken);

      this.logger.info(`User registered: ${user.email}`);
      return { user, tokens };

    } catch (error) {
      this.logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(loginData: LoginData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Find user by email
      const user = await this.findUserByEmail(loginData.email);
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Get password hash
      const result = await this.db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id]
      );

      if (!result.rows[0]) {
        throw new AppError('Invalid email or password', 401);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(loginData.password, result.rows[0].password_hash);
      if (!isValidPassword) {
        throw new AppError('Invalid email or password', 401);
      }

      // Update last active
      await this.updateLastActive(user.id);
      user.lastActive = new Date();

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Store refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      this.logger.info(`User logged in: ${user.email}`);
      return { user, tokens };

    } catch (error) {
      this.logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      // Check if refresh token exists in Redis
      const storedToken = await this.redis.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Get user
      const user = await this.findUserById(decoded.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Store new refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return tokens;

    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw new AppError('Invalid refresh token', 401);
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // Remove refresh token from Redis
      await this.redis.del(`refresh_token:${userId}`);

      // Optionally invalidate the specific refresh token
      if (refreshToken) {
        await this.redis.del(`refresh_token:${refreshToken}`);
      }

      this.logger.info(`User logged out: ${userId}`);
    } catch (error) {
      this.logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      const user = await this.findUserById(decoded.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      return user;
    } catch (error) {
      throw new AppError('Invalid access token', 401);
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'unplug-social',
      audience: 'unplug-app'
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'unplug-social',
      audience: 'unplug-app'
    });

    // Calculate expiry time in seconds
    const expiresIn = this.parseExpiry(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Store refresh token in Redis
   */
  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiry = this.parseExpiry(this.refreshTokenExpiry);
    await this.redis.setex(`refresh_token:${userId}`, expiry, refreshToken);
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900; // 15 minutes default
    }
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    const result = await this.db.query(`
      SELECT id, username, email, display_name, avatar_url, bio, is_verified, is_public, created_at, updated_at, last_active
      FROM users WHERE email = $1
    `, [email.toLowerCase()]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      isVerified: row.is_verified,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActive: row.last_active
    };
  }

  /**
   * Find user by username
   */
  private async findUserByUsername(username: string): Promise<User | null> {
    const result = await this.db.query(`
      SELECT id, username, email, display_name, avatar_url, bio, is_verified, is_public, created_at, updated_at, last_active
      FROM users WHERE username = $1
    `, [username.toLowerCase()]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      isVerified: row.is_verified,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActive: row.last_active
    };
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<User | null> {
    const result = await this.db.query(`
      SELECT id, username, email, display_name, avatar_url, bio, is_verified, is_public, created_at, updated_at, last_active
      FROM users WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      bio: row.bio,
      isVerified: row.is_verified,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActive: row.last_active
    };
  }

  /**
   * Create social profile for new user
   */
  private async createSocialProfile(userId: string): Promise<void> {
    const now = new Date();
    await this.db.query(`
      INSERT INTO social_profiles (user_id, show_in_leaderboards, allow_friend_requests, share_achievements, share_progress, friends_count, circles_count, achievements_shared, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [userId, true, true, true, false, 0, 0, 0, now, now]);
  }

  /**
   * Update user's last active timestamp
   */
  private async updateLastActive(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET last_active = NOW() WHERE id = $1',
      [userId]
    );
  }

  /**
   * Get social profile for user
   */
  async getSocialProfile(userId: string): Promise<SocialProfile | null> {
    const result = await this.db.query(`
      SELECT user_id, show_in_leaderboards, allow_friend_requests, share_achievements, share_progress,
             friends_count, circles_count, achievements_shared, created_at, updated_at
      FROM social_profiles WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      userId: row.user_id,
      showInLeaderboards: row.show_in_leaderboards,
      allowFriendRequests: row.allow_friend_requests,
      shareAchievements: row.share_achievements,
      shareProgress: row.share_progress,
      friendsCount: row.friends_count,
      circlesCount: row.circles_count,
      achievementsShared: row.achievements_shared,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Update social profile
   */
  async updateSocialProfile(userId: string, updates: Partial<SocialProfile>): Promise<void> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'userId' && key !== 'createdAt' && value !== undefined) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClause.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) return;

    setClause.push(`updated_at = $${paramIndex}`);
    values.push(new Date());
    values.push(userId);

    const query = `
      UPDATE social_profiles
      SET ${setClause.join(', ')}
      WHERE user_id = $${paramIndex + 1}
    `;

    await this.db.query(query, values);
  }
}

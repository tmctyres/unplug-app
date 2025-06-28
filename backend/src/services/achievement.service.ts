/**
 * Achievement Service
 * Handles achievement sharing, social validation, and community features
 */

import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';
import { Logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface Achievement {
  id: string;
  userId: string;
  achievementType: string;
  title: string;
  description: string;
  icon: string;
  value?: number;
  unit?: string;
  unlockedAt: Date;
  isShared: boolean;
  shareCount: number;
  likesCount: number;
  createdAt: Date;
}

export interface SharedAchievement extends Achievement {
  user: {
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  isLikedByUser?: boolean;
  comments?: AchievementComment[];
}

export interface AchievementComment {
  id: string;
  achievementId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  createdAt: Date;
}

export interface AchievementLike {
  id: string;
  achievementId: string;
  userId: string;
  createdAt: Date;
}

export class AchievementService {
  private static instance: AchievementService;
  private db: DatabaseService;
  private redis: RedisService;
  private logger: typeof Logger;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.redis = RedisService.getInstance();
    this.logger = Logger;
  }

  static getInstance(): AchievementService {
    if (!AchievementService.instance) {
      AchievementService.instance = new AchievementService();
    }
    return AchievementService.instance;
  }

  /**
   * Submit a new achievement
   */
  async submitAchievement(userId: string, achievementData: {
    achievementType: string;
    title: string;
    description: string;
    icon: string;
    value?: number;
    unit?: string;
    unlockedAt: Date;
  }): Promise<Achievement> {
    try {
      const result = await this.db.query(`
        INSERT INTO achievements (user_id, achievement_type, title, description, icon, value, unit, unlocked_at, is_shared, share_count, likes_count, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 0, 0, NOW())
        RETURNING id, user_id, achievement_type, title, description, icon, value, unit, unlocked_at, is_shared, share_count, likes_count, created_at
      `, [
        userId,
        achievementData.achievementType,
        achievementData.title,
        achievementData.description,
        achievementData.icon,
        achievementData.value,
        achievementData.unit,
        achievementData.unlockedAt
      ]);

      const row = result.rows[0];
      const achievement: Achievement = {
        id: row.id,
        userId: row.user_id,
        achievementType: row.achievement_type,
        title: row.title,
        description: row.description,
        icon: row.icon,
        ...(row.value && { value: parseFloat(row.value) }),
        unit: row.unit,
        unlockedAt: row.unlocked_at,
        isShared: row.is_shared,
        shareCount: row.share_count,
        likesCount: row.likes_count,
        createdAt: row.created_at
      };

      this.logger.info(`Achievement submitted for user ${userId}: ${achievementData.title}`);
      return achievement;

    } catch (error) {
      this.logger.error('Failed to submit achievement:', error);
      throw new AppError('Failed to submit achievement', 500);
    }
  }

  /**
   * Share an achievement
   */
  async shareAchievement(userId: string, achievementId: string): Promise<SharedAchievement> {
    try {
      // Check if achievement exists and belongs to user
      const achievementResult = await this.db.query(`
        SELECT * FROM achievements WHERE id = $1 AND user_id = $2
      `, [achievementId, userId]);

      if (achievementResult.rows.length === 0) {
        throw new AppError('Achievement not found', 404);
      }

      // Update achievement as shared
      await this.db.query(`
        UPDATE achievements 
        SET is_shared = true, share_count = share_count + 1
        WHERE id = $1
      `, [achievementId]);

      // Get shared achievement with user details
      const sharedAchievement = await this.getSharedAchievement(achievementId, userId);
      
      // Cache in Redis for quick access
      await this.cacheSharedAchievement(sharedAchievement);

      // Add to shared achievements feed
      await this.addToSharedFeed(achievementId);

      this.logger.info(`Achievement shared: ${achievementId} by user ${userId}`);
      return sharedAchievement;

    } catch (error) {
      this.logger.error('Failed to share achievement:', error);
      throw error;
    }
  }

  /**
   * Get shared achievements feed
   */
  async getSharedAchievements(userId: string, limit: number = 20, offset: number = 0): Promise<SharedAchievement[]> {
    try {
      // Try to get from Redis cache first
      const cacheKey = 'shared_achievements_feed';
      const cachedIds = await this.redis.lrange(cacheKey, offset, offset + limit - 1);
      
      if (cachedIds.length > 0) {
        const achievements: SharedAchievement[] = [];
        for (const achievementId of cachedIds) {
          const cached = await this.redis.get(`shared_achievement:${achievementId}`);
          if (cached) {
            const achievement = JSON.parse(cached);
            achievement.isLikedByUser = await this.isLikedByUser(achievementId, userId);
            achievements.push(achievement);
          }
        }
        if (achievements.length > 0) {
          return achievements;
        }
      }

      // If not in cache, get from database
      const result = await this.db.query(`
        SELECT 
          a.id, a.user_id, a.achievement_type, a.title, a.description, a.icon, 
          a.value, a.unit, a.unlocked_at, a.is_shared, a.share_count, a.likes_count, a.created_at,
          u.username, u.display_name, u.avatar_url, u.is_verified
        FROM achievements a
        JOIN users u ON a.user_id = u.id
        WHERE a.is_shared = true
        ORDER BY a.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      const achievements: SharedAchievement[] = [];
      for (const row of result.rows) {
        const achievement: SharedAchievement = {
          id: row.id,
          userId: row.user_id,
          achievementType: row.achievement_type,
          title: row.title,
          description: row.description,
          icon: row.icon,
          ...(row.value && { value: parseFloat(row.value) }),
          unit: row.unit,
          unlockedAt: row.unlocked_at,
          isShared: row.is_shared,
          shareCount: row.share_count,
          likesCount: row.likes_count,
          createdAt: row.created_at,
          user: {
            username: row.username,
            displayName: row.display_name,
            avatarUrl: row.avatar_url,
            isVerified: row.is_verified
          },
          isLikedByUser: await this.isLikedByUser(row.id, userId)
        };
        achievements.push(achievement);
      }

      // Cache the results
      await this.cacheSharedAchievementsFeed(achievements);

      return achievements;

    } catch (error) {
      this.logger.error('Failed to get shared achievements:', error);
      throw new AppError('Failed to load shared achievements', 500);
    }
  }

  /**
   * Like an achievement
   */
  async likeAchievement(userId: string, achievementId: string): Promise<{ liked: boolean; likesCount: number }> {
    try {
      // Check if already liked
      const existingLike = await this.db.query(`
        SELECT id FROM likes WHERE user_id = $1 AND target_type = 'achievement' AND target_id = $2
      `, [userId, achievementId]);

      if (existingLike.rows.length > 0) {
        // Unlike
        await this.db.query(`
          DELETE FROM likes WHERE user_id = $1 AND target_type = 'achievement' AND target_id = $2
        `, [userId, achievementId]);

        await this.db.query(`
          UPDATE achievements SET likes_count = likes_count - 1 WHERE id = $1
        `, [achievementId]);

        const countResult = await this.db.query(`
          SELECT likes_count FROM achievements WHERE id = $1
        `, [achievementId]);

        return {
          liked: false,
          likesCount: countResult.rows[0].likes_count
        };
      } else {
        // Like
        await this.db.query(`
          INSERT INTO likes (user_id, target_type, target_id, created_at)
          VALUES ($1, 'achievement', $2, NOW())
        `, [userId, achievementId]);

        await this.db.query(`
          UPDATE achievements SET likes_count = likes_count + 1 WHERE id = $1
        `, [achievementId]);

        const countResult = await this.db.query(`
          SELECT likes_count FROM achievements WHERE id = $1
        `, [achievementId]);

        return {
          liked: true,
          likesCount: countResult.rows[0].likes_count
        };
      }

    } catch (error) {
      this.logger.error('Failed to like achievement:', error);
      throw new AppError('Failed to like achievement', 500);
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const result = await this.db.query(`
        SELECT id, user_id, achievement_type, title, description, icon, value, unit, unlocked_at, is_shared, share_count, likes_count, created_at
        FROM achievements
        WHERE user_id = $1
        ORDER BY unlocked_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        achievementType: row.achievement_type,
        title: row.title,
        description: row.description,
        icon: row.icon,
        ...(row.value && { value: parseFloat(row.value) }),
        unit: row.unit,
        unlockedAt: row.unlocked_at,
        isShared: row.is_shared,
        shareCount: row.share_count,
        likesCount: row.likes_count,
        createdAt: row.created_at
      }));

    } catch (error) {
      this.logger.error('Failed to get user achievements:', error);
      throw new AppError('Failed to load user achievements', 500);
    }
  }

  /**
   * Get shared achievement with user details
   */
  private async getSharedAchievement(achievementId: string, requestingUserId?: string): Promise<SharedAchievement> {
    const result = await this.db.query(`
      SELECT 
        a.id, a.user_id, a.achievement_type, a.title, a.description, a.icon, 
        a.value, a.unit, a.unlocked_at, a.is_shared, a.share_count, a.likes_count, a.created_at,
        u.username, u.display_name, u.avatar_url, u.is_verified
      FROM achievements a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [achievementId]);

    if (result.rows.length === 0) {
      throw new AppError('Achievement not found', 404);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      achievementType: row.achievement_type,
      title: row.title,
      description: row.description,
      icon: row.icon,
      ...(row.value && { value: parseFloat(row.value) }),
      unit: row.unit,
      unlockedAt: row.unlocked_at,
      isShared: row.is_shared,
      shareCount: row.share_count,
      likesCount: row.likes_count,
      createdAt: row.created_at,
      user: {
        username: row.username,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        isVerified: row.is_verified
      },
      isLikedByUser: requestingUserId ? await this.isLikedByUser(achievementId, requestingUserId) : false
    };
  }

  /**
   * Check if achievement is liked by user
   */
  private async isLikedByUser(achievementId: string, userId: string): Promise<boolean> {
    const result = await this.db.query(`
      SELECT id FROM likes WHERE user_id = $1 AND target_type = 'achievement' AND target_id = $2
    `, [userId, achievementId]);

    return result.rows.length > 0;
  }

  /**
   * Cache shared achievement in Redis
   */
  private async cacheSharedAchievement(achievement: SharedAchievement): Promise<void> {
    const cacheKey = `shared_achievement:${achievement.id}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(achievement)); // 1 hour cache
  }

  /**
   * Add achievement to shared feed
   */
  private async addToSharedFeed(achievementId: string): Promise<void> {
    const feedKey = 'shared_achievements_feed';
    await this.redis.lpush(feedKey, achievementId);
    
    // Keep only latest 1000 achievements in feed
    await this.redis.ltrim(feedKey, 0, 999);
  }

  /**
   * Cache shared achievements feed
   */
  private async cacheSharedAchievementsFeed(achievements: SharedAchievement[]): Promise<void> {
    const feedKey = 'shared_achievements_feed';
    
    // Cache individual achievements
    for (const achievement of achievements) {
      await this.cacheSharedAchievement(achievement);
    }
    
    // Cache the feed order
    const achievementIds = achievements.map(a => a.id);
    if (achievementIds.length > 0) {
      await this.redis.del(feedKey);
      await this.redis.rpush(feedKey, ...achievementIds);
      await this.redis.expire(feedKey, 1800); // 30 minutes
    }
  }
}

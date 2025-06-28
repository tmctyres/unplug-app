/**
 * Leaderboard Service
 * Handles real-time leaderboards with ranking algorithms and data persistence
 */

import { DatabaseService } from './database.service';
import { RedisService } from './redis.service';
import { Logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface LeaderboardConfig {
  id: string;
  type: string;
  category: string;
  timeframe: string;
  name: string;
  description: string;
  isActive: boolean;
  maxEntries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  leaderboardId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  value: number;
  rank: number;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserScore {
  userId: string;
  category: string;
  timeframe: string;
  value: number;
  timestamp: Date;
}

export class LeaderboardService {
  private static instance: LeaderboardService;
  private db: DatabaseService;
  private redis: RedisService;
  private logger: typeof Logger;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.redis = RedisService.getInstance();
    this.logger = Logger;
  }

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  /**
   * Get all active leaderboards
   */
  async getLeaderboards(): Promise<LeaderboardConfig[]> {
    try {
      const result = await this.db.query(`
        SELECT id, type, category, timeframe, name, description, is_active, max_entries, created_at, updated_at
        FROM leaderboards 
        WHERE is_active = true
        ORDER BY name
      `);

      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        category: row.category,
        timeframe: row.timeframe,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        maxEntries: row.max_entries,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      this.logger.error('Failed to get leaderboards:', error);
      throw new AppError('Failed to load leaderboards', 500);
    }
  }

  /**
   * Get leaderboard by ID
   */
  async getLeaderboard(leaderboardId: string): Promise<LeaderboardConfig | null> {
    try {
      const result = await this.db.query(`
        SELECT id, type, category, timeframe, name, description, is_active, max_entries, created_at, updated_at
        FROM leaderboards 
        WHERE id = $1 AND is_active = true
      `, [leaderboardId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        type: row.type,
        category: row.category,
        timeframe: row.timeframe,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        maxEntries: row.max_entries,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      this.logger.error('Failed to get leaderboard:', error);
      throw new AppError('Failed to load leaderboard', 500);
    }
  }

  /**
   * Get leaderboard entries with rankings
   */
  async getLeaderboardEntries(leaderboardId: string, limit: number = 100, offset: number = 0): Promise<LeaderboardEntry[]> {
    try {
      // First check if leaderboard exists
      const leaderboard = await this.getLeaderboard(leaderboardId);
      if (!leaderboard) {
        throw new AppError('Leaderboard not found', 404);
      }

      // Try to get from Redis cache first
      const cacheKey = `leaderboard:${leaderboardId}:entries`;
      const cachedEntries = await this.redis.zrevrange(cacheKey, offset, offset + limit - 1, true);
      
      if (cachedEntries.length > 0) {
        // Parse cached entries
        const entries: LeaderboardEntry[] = [];
        for (let i = 0; i < cachedEntries.length; i += 2) {
          const userId = cachedEntries[i];
          const scoreStr = cachedEntries[i + 1];
          if (!userId || !scoreStr) continue;
          const score = parseFloat(scoreStr);
          
          // Get user details
          const userResult = await this.db.query(`
            SELECT u.username, u.display_name, u.avatar_url, le.is_anonymous, le.created_at, le.updated_at
            FROM users u
            JOIN leaderboard_entries le ON u.id = le.user_id
            WHERE u.id = $1 AND le.leaderboard_id = $2
          `, [userId, leaderboardId]);

          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            entries.push({
              id: `${leaderboardId}_${userId}`,
              leaderboardId,
              userId: userId!,
              username: user.is_anonymous ? 'Anonymous' : user.username,
              displayName: user.is_anonymous ? `Anonymous ${offset + Math.floor(i / 2) + 1}` : user.display_name,
              avatarUrl: user.is_anonymous ? undefined : user.avatar_url,
              value: score,
              rank: offset + Math.floor(i / 2) + 1,
              isAnonymous: user.is_anonymous,
              createdAt: user.created_at,
              updatedAt: user.updated_at
            });
          }
        }
        return entries;
      }

      // If not in cache, get from database
      const result = await this.db.query(`
        SELECT 
          le.id,
          le.leaderboard_id,
          le.user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          le.value,
          le.rank,
          le.is_anonymous,
          le.created_at,
          le.updated_at
        FROM leaderboard_entries le
        JOIN users u ON le.user_id = u.id
        WHERE le.leaderboard_id = $1
        ORDER BY le.rank ASC
        LIMIT $2 OFFSET $3
      `, [leaderboardId, limit, offset]);

      const entries = result.rows.map(row => ({
        id: row.id,
        leaderboardId: row.leaderboard_id,
        userId: row.user_id,
        username: row.is_anonymous ? 'Anonymous' : row.username,
        displayName: row.is_anonymous ? `Anonymous ${row.rank}` : row.display_name,
        avatarUrl: row.is_anonymous ? undefined : row.avatar_url,
        value: parseFloat(row.value),
        rank: row.rank,
        isAnonymous: row.is_anonymous,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // Cache the results in Redis
      await this.cacheLeaderboardEntries(leaderboardId, entries);

      return entries;
    } catch (error) {
      this.logger.error('Failed to get leaderboard entries:', error);
      throw error;
    }
  }

  /**
   * Submit user score to leaderboard
   */
  async submitScore(userId: string, leaderboardId: string, value: number, isAnonymous: boolean = false): Promise<LeaderboardEntry> {
    try {
      // Check if leaderboard exists
      const leaderboard = await this.getLeaderboard(leaderboardId);
      if (!leaderboard) {
        throw new AppError('Leaderboard not found', 404);
      }

      // Use database transaction for consistency
      const entry = await this.db.transaction(async (client) => {
        // Insert or update entry
        const entryResult = await client.query(`
          INSERT INTO leaderboard_entries (leaderboard_id, user_id, value, is_anonymous, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (leaderboard_id, user_id)
          DO UPDATE SET 
            value = EXCLUDED.value,
            is_anonymous = EXCLUDED.is_anonymous,
            updated_at = NOW()
          RETURNING id, created_at, updated_at
        `, [leaderboardId, userId, value, isAnonymous]);

        // Recalculate ranks for this leaderboard
        await client.query(`
          UPDATE leaderboard_entries 
          SET rank = ranked.new_rank
          FROM (
            SELECT user_id, ROW_NUMBER() OVER (ORDER BY value DESC) as new_rank
            FROM leaderboard_entries 
            WHERE leaderboard_id = $1
          ) ranked
          WHERE leaderboard_entries.leaderboard_id = $1 
          AND leaderboard_entries.user_id = ranked.user_id
        `, [leaderboardId]);

        // Get updated entry with rank
        const updatedEntryResult = await client.query(`
          SELECT 
            le.id,
            le.leaderboard_id,
            le.user_id,
            u.username,
            u.display_name,
            u.avatar_url,
            le.value,
            le.rank,
            le.is_anonymous,
            le.created_at,
            le.updated_at
          FROM leaderboard_entries le
          JOIN users u ON le.user_id = u.id
          WHERE le.leaderboard_id = $1 AND le.user_id = $2
        `, [leaderboardId, userId]);

        return entryResult.rows[0];
      });

      // Create entry object
      const leaderboardEntry: LeaderboardEntry = {
        id: entry.id,
        leaderboardId: entry.leaderboard_id,
        userId: entry.user_id,
        username: entry.is_anonymous ? 'Anonymous' : entry.username,
        displayName: entry.is_anonymous ? `Anonymous ${entry.rank}` : entry.display_name,
        avatarUrl: entry.is_anonymous ? undefined : entry.avatar_url,
        value: parseFloat(entry.value),
        rank: entry.rank,
        isAnonymous: entry.is_anonymous,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at
      };

      // Update Redis cache
      await this.updateLeaderboardCache(leaderboardId, userId, value);

      // Invalidate cached entries to force refresh
      await this.redis.del(`leaderboard:${leaderboardId}:entries`);

      this.logger.info(`Score submitted for user ${userId} on leaderboard ${leaderboardId}: ${value}`);
      return leaderboardEntry;

    } catch (error) {
      this.logger.error('Failed to submit score:', error);
      throw error;
    }
  }

  /**
   * Get user's rank in a specific leaderboard
   */
  async getUserRank(userId: string, leaderboardId: string): Promise<{ rank: number; value: number } | null> {
    try {
      const result = await this.db.query(`
        SELECT rank, value
        FROM leaderboard_entries
        WHERE leaderboard_id = $1 AND user_id = $2
      `, [leaderboardId, userId]);

      if (result.rows.length === 0) return null;

      return {
        rank: result.rows[0].rank,
        value: parseFloat(result.rows[0].value)
      };
    } catch (error) {
      this.logger.error('Failed to get user rank:', error);
      throw new AppError('Failed to get user rank', 500);
    }
  }

  /**
   * Get user's ranks across all leaderboards
   */
  async getUserRanks(userId: string): Promise<Array<{ leaderboardId: string; rank: number; value: number }>> {
    try {
      const result = await this.db.query(`
        SELECT leaderboard_id, rank, value
        FROM leaderboard_entries
        WHERE user_id = $1
        ORDER BY rank ASC
      `, [userId]);

      return result.rows.map(row => ({
        leaderboardId: row.leaderboard_id,
        rank: row.rank,
        value: parseFloat(row.value)
      }));
    } catch (error) {
      this.logger.error('Failed to get user ranks:', error);
      throw new AppError('Failed to get user ranks', 500);
    }
  }

  /**
   * Cache leaderboard entries in Redis
   */
  private async cacheLeaderboardEntries(leaderboardId: string, entries: LeaderboardEntry[]): Promise<void> {
    const cacheKey = `leaderboard:${leaderboardId}:entries`;
    
    // Clear existing cache
    await this.redis.del(cacheKey);
    
    // Add entries to sorted set
    for (const entry of entries) {
      await this.redis.zadd(cacheKey, entry.value, entry.userId);
    }
    
    // Set expiry (5 minutes)
    await this.redis.expire(cacheKey, 300);
  }

  /**
   * Update leaderboard cache with new score
   */
  private async updateLeaderboardCache(leaderboardId: string, userId: string, value: number): Promise<void> {
    const cacheKey = `leaderboard:${leaderboardId}:entries`;
    await this.redis.zadd(cacheKey, value, userId);
    await this.redis.expire(cacheKey, 300);
  }

  /**
   * Get leaderboard statistics
   */
  async getLeaderboardStats(leaderboardId: string): Promise<{ totalEntries: number; topScore: number; averageScore: number }> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_entries,
          MAX(value) as top_score,
          AVG(value) as average_score
        FROM leaderboard_entries
        WHERE leaderboard_id = $1
      `, [leaderboardId]);

      const row = result.rows[0];
      return {
        totalEntries: parseInt(row.total_entries),
        topScore: parseFloat(row.top_score) || 0,
        averageScore: parseFloat(row.average_score) || 0
      };
    } catch (error) {
      this.logger.error('Failed to get leaderboard stats:', error);
      throw new AppError('Failed to get leaderboard statistics', 500);
    }
  }
}

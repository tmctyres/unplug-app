/**
 * Redis Service
 * Handles Redis connections for caching and session management
 */

import Redis from 'ioredis';
import { Logger } from '../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private client!: Redis;
  private logger: typeof Logger;
  private isInitialized: boolean = false;

  private constructor() {
    this.logger = Logger;
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';
      
      this.client = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
      });

      // Event handlers
      this.client.on('connect', () => {
        this.logger.info('Redis connected');
      });

      this.client.on('ready', () => {
        this.logger.info('Redis ready');
        this.isInitialized = true;
      });

      this.client.on('error', (error) => {
        this.logger.error('Redis error:', error);
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.isInitialized = false;
      });

      this.client.on('reconnecting', () => {
        this.logger.info('Redis reconnecting...');
      });

      // Connect to Redis
      await this.client.connect();

      // Test the connection
      await this.client.ping();
      this.logger.info('Redis connection established');

    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      throw error;
    }
  }

  // Basic Redis operations
  async get(key: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    await this.client.setex(key, ttl, value);
  }

  async del(key: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.exists(key);
  }

  async expire(key: string, ttl: number): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.ttl(key);
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.hdel(key, field);
  }

  // List operations
  async lpush(key: string, value: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.lpush(key, value);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.rpush(key, ...values);
  }

  async lpop(key: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.rpop(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.lrange(key, start, stop);
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.ltrim(key, start, stop);
  }

  // Set operations
  async sadd(key: string, member: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.sadd(key, member);
  }

  async srem(key: string, member: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.srem(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.sismember(key, member);
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    if (withScores) {
      return this.client.zrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    if (withScores) {
      return this.client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrevrange(key, start, stop);
  }

  async zrank(key: string, member: string): Promise<number | null> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.zrank(key, member);
  }

  async zscore(key: string, member: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.zscore(key, member);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.publish(channel, message);
  }

  // Utility methods
  async flushall(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.flushall();
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.keys(pattern);
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isInitialized = false;
      this.logger.info('Redis connection closed');
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Get Redis info
  async getInfo(): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Redis not initialized');
    }
    return this.client.info();
  }

  getClient(): Redis {
    return this.client;
  }
}

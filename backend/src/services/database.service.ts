/**
 * Database Service
 * Handles PostgreSQL database connections and queries
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { Logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private pool!: Pool;
  private logger: typeof Logger;
  private isInitialized: boolean = false;

  private constructor() {
    this.logger = Logger;
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: process.env['DATABASE_URL'],
        ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isInitialized = true;
      this.logger.info('Database connection established');

      // Set up error handling
      this.pool.on('error', (err) => {
        this.logger.error('Unexpected error on idle client', err);
      });

    } catch (error) {
      this.logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        this.logger.warn(`Slow query detected (${duration}ms):`, text);
      }
      
      return result;
    } catch (error) {
      this.logger.error('Database query error:', error);
      this.logger.error('Query:', text);
      this.logger.error('Params:', params);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isInitialized = false;
      this.logger.info('Database connection closed');
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Get connection info
  getConnectionInfo(): any {
    if (!this.pool) return null;
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

/**
 * Unplug Social Backend Server
 * Main server entry point with Express and Socket.IO
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import dotenv from 'dotenv';

import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket.service';
import { Logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { authMiddleware } from './middleware/auth.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import socialRoutes from './routes/social.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import postRoutes from './routes/post.routes';
import achievementRoutes from './routes/achievement.routes';
import notificationRoutes from './routes/notification.routes';

// Load environment variables
dotenv.config();

class UnplugSocialServer {
  private app: express.Application;
  private server: any;
  private io!: SocketIOServer;
  private port: number;
  private logger: typeof Logger;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = parseInt(process.env['PORT'] || '3000', 10);
    this.logger = Logger;
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketIO();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env['FRONTEND_URLS']?.split(',') || ['http://localhost:8080'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => this.logger.info(message.trim()) }
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Slow down repeated requests
    const speedLimiter = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per 15 minutes, then...
      delayMs: 500, // begin adding 500ms of delay per request above 50
      maxDelayMs: 20000, // maximum delay of 20 seconds
    });
    this.app.use('/api/', speedLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development'
      });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/social', authMiddleware, socialRoutes);
    this.app.use('/api/leaderboards', authMiddleware, leaderboardRoutes);
    this.app.use('/api/posts', authMiddleware, postRoutes);
    this.app.use('/api/achievements', authMiddleware, achievementRoutes);
    this.app.use('/api/notifications', authMiddleware, notificationRoutes);

    // API documentation
    if (process.env['NODE_ENV'] !== 'production') {
      const swaggerUi = require('swagger-ui-express');
      const swaggerSpec = require('./config/swagger.config');
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    }

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint not found',
        path: req.path,
        method: req.method
      });
    });

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'Unplug Social Backend',
        version: '1.0.0',
        status: 'running',
        documentation: process.env['NODE_ENV'] !== 'production' ? '/api-docs' : undefined
      });
    });
  }

  private initializeSocketIO(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env['FRONTEND_URLS']?.split(',') || ['http://localhost:8080'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Initialize socket service
    const socketService = new SocketService(this.io);

    this.logger.info('Socket.IO initialized');
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Close server gracefully
      this.gracefulShutdown();
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      // Close server gracefully
      this.gracefulShutdown();
    });

    // Graceful shutdown signals
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down gracefully');
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      this.logger.info('Starting graceful shutdown...');

      // Close server
      this.server.close(() => {
        this.logger.info('HTTP server closed');
      });

      // Close Socket.IO
      this.io.close(() => {
        this.logger.info('Socket.IO server closed');
      });

      // Close database connections
      await DatabaseService.getInstance().close();
      this.logger.info('Database connections closed');

      // Close Redis connections
      await RedisService.getInstance().close();
      this.logger.info('Redis connections closed');

      this.logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await DatabaseService.getInstance().initialize();
      this.logger.info('Database initialized');

      // Initialize Redis
      await RedisService.getInstance().initialize();
      this.logger.info('Redis initialized');

      // Initialize authentication service
      await AuthService.getInstance().initialize();
      this.logger.info('Authentication service initialized');

      // Start server
      this.server.listen(this.port, () => {
        this.logger.info(`Server running on port ${this.port}`);
        this.logger.info(`Environment: ${process.env['NODE_ENV'] || 'development'}`);

        if (process.env['NODE_ENV'] !== 'production') {
          this.logger.info(`API Documentation: http://localhost:${this.port}/api-docs`);
        }
      });

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getServer(): any {
    return this.server;
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new UnplugSocialServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default UnplugSocialServer;

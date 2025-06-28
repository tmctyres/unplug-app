import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { Logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import simpleRoutes from './routes/simple-routes';

export class SimpleServer {
  private app: express.Application;
  private server: http.Server;
  private io!: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.port = parseInt(process.env['PORT'] || '3000', 10);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: process.env['FRONTEND_URLS']?.split(',') || ['http://localhost:8080'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined'));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env['NODE_ENV'] || 'development'
      });
    });

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'Unplug Social Backend (Simple)',
        version: '1.0.0',
        status: 'running',
        message: 'Mock backend for testing'
      });
    });

    // API routes
    this.app.use('/api', simpleRoutes);
  }

  private setupSocketIO(): void {
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env['FRONTEND_URLS']?.split(',') || ['http://localhost:8080'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      Logger.info(`Socket connected: ${socket.id}`);
      
      socket.emit('connected', {
        message: 'Connected to Unplug social features',
        timestamp: new Date().toISOString(),
      });

      socket.on('disconnect', () => {
        Logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      this.server.listen(this.port, () => {
        Logger.info(`🚀 Simple Unplug Backend started successfully!`);
        Logger.info(`📡 Server running on port ${this.port}`);
        Logger.info(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
        Logger.info(`📋 API available at: http://localhost:${this.port}/api`);
        Logger.info(`🔌 Socket.IO available at: http://localhost:${this.port}`);
        Logger.info(`💚 Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      Logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    Logger.info('🛑 Shutting down server...');
    
    this.server.close(() => {
      Logger.info('✅ Server shut down successfully');
      process.exit(0);
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new SimpleServer();
  server.start().catch((error) => {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

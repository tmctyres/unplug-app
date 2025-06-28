import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { Logger } from '../utils/logger';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    isOperational = true;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  // Handle database errors
  if (error.name === 'QueryFailedError') {
    statusCode = 500;
    message = 'Database query failed';
    isOperational = true;
  }

  // Log error
  if (!isOperational || statusCode >= 500) {
    Logger.error('Unhandled error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    Logger.warn('Operational error:', {
      error: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  // Send error response
  const response: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
  };

  // Include stack trace in development
  if (process.env['NODE_ENV'] === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    path: req.url,
  });
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

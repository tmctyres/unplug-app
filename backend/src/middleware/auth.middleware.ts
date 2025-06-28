import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { Logger } from '../utils/logger';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        role?: string;
      };
    }
  }
}

/**
 * Authentication middleware
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const jwtSecret = process.env['JWT_SECRET'] || 'your-jwt-secret';
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Add user info to request
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };
      
      next();
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      } else {
        throw new AuthenticationError('Token verification failed');
      }
    }
  } catch (error) {
    Logger.warn('Authentication failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });
    
    next(error);
  }
};

/**
 * Optional authentication middleware (doesn't throw if no token)
 */
export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next(); // Continue without user
    }

    const jwtSecret = process.env['JWT_SECRET'] || 'your-jwt-secret';
    
    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role,
      };
    } catch (jwtError) {
      // Ignore JWT errors in optional auth
      Logger.debug('Optional auth failed:', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
      });
    }
    
    next();
  } catch (error) {
    next(); // Continue without user on any error
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const userRole = req.user.role || 'user';
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(userRole)) {
      throw new AuthorizationError('Insufficient permissions');
    }
    
    next();
  };
};

/**
 * Admin role middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Moderator or admin role middleware
 */
export const requireModerator = requireRole(['admin', 'moderator']);

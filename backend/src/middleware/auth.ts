import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export interface AuthRequest extends Request {
  user?: {
    username: string;
  };
}

/**
 * Basic Authentication Middleware
 */
export const basicAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header'
      });
      return;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (!username || !password) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials format'
      });
      return;
    }

    // Validate credentials
    if (username !== config.auth.username || password !== config.auth.password) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
      return;
    }

    // Attach user to request
    (req as AuthRequest).user = { username };
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

/**
 * Generate JWT Token
 */
export const generateToken = (username: string): string => {
  return jwt.sign(
    { username },
    config.auth.jwtSecret,
    { expiresIn: '24h' }
  );
};

/**
 * JWT Authentication Middleware
 */
export const jwtAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Missing or invalid Authorization header'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as { username: string };
      (req as AuthRequest).user = { username: decoded.username };
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../database/db.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: 'citizen' | 'mla' | 'staff' | 'officer' | 'superadmin';
  constituency_id?: string;
  department_id?: string;
  ward_id?: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token missing or invalid',
      errorCode: 'UNAUTHORIZED'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
    const user = db.prepare(`
      SELECT id, name, email, mobile, role, constituency_id, department_id, ward_id, status
      FROM users WHERE id = ?
    `).get(decoded.id) as AuthUser | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User associated with token no longer exists',
        errorCode: 'USER_NOT_FOUND'
      });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account is suspended or pending verification',
        errorCode: 'ACCOUNT_INACTIVE'
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session token',
      errorCode: 'TOKEN_EXPIRED'
    });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        errorCode: 'UNAUTHORIZED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' lacks permission for this action`,
        errorCode: 'FORBIDDEN'
      });
      return;
    }

    next();
  };
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
      const user = db.prepare(`
        SELECT id, name, email, mobile, role, constituency_id, department_id, ward_id, status
        FROM users WHERE id = ?
      `).get(decoded.id) as AuthUser | undefined;
      if (user && user.status === 'active') {
        req.user = user;
      }
    } catch {
      // Ignore token failure for optional endpoints
    }
  }
  next();
}

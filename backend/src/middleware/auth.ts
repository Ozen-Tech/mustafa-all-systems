import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UserRole } from '../types';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userRole = payload.role;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireSupervisor(req: AuthRequest, res: Response, next: NextFunction) {
  // ADMIN tem acesso a todas as funcionalidades de SUPERVISOR
  if (req.userRole !== UserRole.SUPERVISOR && req.userRole !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Supervisor or Admin access required' });
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== UserRole.ADMIN) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

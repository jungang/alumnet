import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/authService';
import { UserSession, UserRole } from '../types/models';

export interface AuthRequest extends Request {
  userSession?: UserSession;
}

// 认证中间件（可选认证，未认证则为Guest）
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 未提供Token，作为Guest处理
    req.userSession = { role: 'guest' };
    return next();
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyToken(token);

  if (!payload) {
    // Token无效，作为Guest处理
    req.userSession = { role: 'guest' };
    return next();
  }

  req.userSession = {
    userId: payload.userId,
    role: payload.role,
    alumniId: payload.alumniId,
    className: payload.className,
  };

  next();
}

// 必须认证中间件
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, message: 'Token无效或已过期' });
  }

  req.userSession = {
    userId: payload.userId,
    role: payload.role,
    alumniId: payload.alumniId,
    className: payload.className,
  };

  next();
}

// 角色检查中间件
export function requireRole(requiredRole: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userSession) {
      return res.status(401).json({ success: false, message: '请先登录' });
    }

    if (!authService.hasPermission(req.userSession.role, requiredRole)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }

    next();
  };
}

// 必须是已验证校友
export function requireVerifiedAlumni(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userSession || req.userSession.role === 'guest') {
    return res.status(401).json({ success: false, message: '请先验证校友身份' });
  }
  next();
}

// 必须是管理员
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userSession || req.userSession.role !== 'admin') {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
  }
  next();
}

import { Request, Response, NextFunction } from 'express';
import { authService, TokenPayload } from '../services/authService';
import { UserSession, UserRole, AdminRole } from '../types/models';

export interface AuthRequest extends Request {
  userSession?: UserSession;
}

/**
 * 认证中间件（可选认证，未认证则为Guest）
 *
 * 修复：当客户端提供了 Token 但 Token 无效时，返回 401 而非静默降级为 Guest。
 * 这样客户端可以知道 Token 过期并刷新，而不是以 Guest 身份继续操作。
 * 未提供 Token 的请求仍作为 Guest 处理（公开 API 的正常行为）。
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 未提供Token，作为Guest处理（公开API的正常行为）
    req.userSession = { role: 'guest' };
    return next();
  }

  const token = authHeader.substring(7);

  // 检查 token 黑名单
  if (authService.isBlacklisted(token)) {
    return res.status(401).json({ success: false, code: 'TOKEN_REVOKED', message: 'Token已失效，请重新登录' });
  }

  const payload = authService.verifyToken(token);

  if (!payload) {
    // 客户端提供了Token但无效 → 返回401，让客户端知道需要刷新Token
    // 只对 /api/admin 和 /api/auth 路径强制返回401，公开API仍允许Guest访问
    if (req.path.startsWith('/admin') || req.path.startsWith('/auth')) {
      return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Token无效或已过期，请重新登录' });
    }
    // 公开API：Token无效但允许降级为Guest（兼容现有客户端）
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
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: '请先登录' });
  }

  const token = authHeader.substring(7);
  const payload = authService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, code: 'TOKEN_INVALID', message: 'Token无效或已过期' });
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
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: '请先登录' });
    }

    if (!authService.hasPermission(req.userSession.role, requiredRole)) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: '权限不足' });
    }

    next();
  };
}

// 必须是已验证校友
export function requireVerifiedAlumni(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userSession || req.userSession.role === 'guest') {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: '请先验证校友身份' });
  }
  next();
}

/**
 * 必须是管理员（含 super_admin）
 *
 * 修复：原实现只允许 role === 'admin'，super_admin 被拒。
 * 现改为允许 admin 和 super_admin 两种角色。
 * 同时修正 HTTP 状态码：未认证 → 401，权限不足 → 403。
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userSession) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: '请先登录' });
  }

  if (!['admin', 'super_admin'].includes(req.userSession.role)) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', message: '权限不足' });
  }

  next();
}

/**
 * auth 中间件单元测试
 * 测试认证和授权功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  authMiddleware,
  requireAuth,
  requireRole,
  requireVerifiedAlumni,
  requireAdmin,
  AuthRequest,
} from '../../../src/middleware/auth';
import { authService } from '../../../src/services/authService';

// Mock authService
vi.mock('../../../src/services/authService', () => ({
  authService: {
    verifyToken: vi.fn(),
    hasPermission: vi.fn(),
  },
}));

describe('authMiddleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should set guest role when no authorization header', () => {
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockReq.userSession).toEqual({ role: 'guest' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set guest role when authorization header does not start with Bearer', () => {
    mockReq.headers = { authorization: 'Basic token123' };
    
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockReq.userSession).toEqual({ role: 'guest' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set guest role when token is invalid', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    vi.mocked(authService.verifyToken).mockReturnValue(null);
    
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockReq.userSession).toEqual({ role: 'guest' });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should set user session when token is valid', () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(authService.verifyToken).mockReturnValue({
      userId: 'user-123',
      role: 'verified_alumni',
      alumniId: 'alumni-456',
      className: 'Class A',
    });
    
    authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockReq.userSession).toEqual({
      userId: 'user-123',
      role: 'verified_alumni',
      alumniId: 'alumni-456',
      className: 'Class A',
    });
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('requireAuth', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should return 401 when no authorization header', () => {
    requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: '请先登录',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    mockReq.headers = { authorization: 'Bearer invalid-token' };
    vi.mocked(authService.verifyToken).mockReturnValue(null);
    
    requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token无效或已过期',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next when token is valid', () => {
    mockReq.headers = { authorization: 'Bearer valid-token' };
    vi.mocked(authService.verifyToken).mockReturnValue({
      userId: 'user-123',
      role: 'admin',
    });
    
    requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockReq.userSession).toBeDefined();
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('should return 401 when no user session', () => {
    const middleware = requireRole('admin');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 when user does not have required role', () => {
    mockReq.userSession = { role: 'guest' };
    vi.mocked(authService.hasPermission).mockReturnValue(false);
    
    const middleware = requireRole('admin');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: '权限不足',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next when user has required role', () => {
    mockReq.userSession = { role: 'admin' };
    vi.mocked(authService.hasPermission).mockReturnValue(true);
    
    const middleware = requireRole('admin');
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('requireVerifiedAlumni', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should return 401 when no user session', () => {
    requireVerifiedAlumni(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when user is guest', () => {
    mockReq.userSession = { role: 'guest' };
    
    requireVerifiedAlumni(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next when user is verified alumni', () => {
    mockReq.userSession = { role: 'verified_alumni' };
    
    requireVerifiedAlumni(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next when user is admin', () => {
    mockReq.userSession = { role: 'admin' };
    
    requireVerifiedAlumni(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should return 403 when no user session', () => {
    requireAdmin(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 when user is not admin', () => {
    mockReq.userSession = { role: 'verified_alumni' };
    
    requireAdmin(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: '需要管理员权限',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next when user is admin', () => {
    mockReq.userSession = { role: 'admin' };
    
    requireAdmin(mockReq as AuthRequest, mockRes as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
  });
});

import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import logger from '../config/logger';
import { alumniRepository } from '../repositories/alumniRepository';
import { UserRole, UserSession } from '../types/models';

const JWT_SECRET: Secret = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })();
const JWT_REFRESH_SECRET: Secret = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
// 默认7天过期，转换为秒
const JWT_EXPIRES_IN_SECONDS = parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '604800', 10);
const REFRESH_TOKEN_EXPIRES_IN_SECONDS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_SECONDS || '2592000', 10); // 30天

// Token 黑名单（内存存储，生产环境应使用 Redis）
const tokenBlacklist = new Map<string, number>();

// 定期清理过期黑名单条目
setInterval(() => {
  const now = Date.now();
  for (const [token, expires] of tokenBlacklist) {
    if (expires < now) tokenBlacklist.delete(token);
  }
}, 3600000); // 每小时清理

export interface TokenPayload {
  userId?: string;
  role: UserRole;
  alumniId?: string;
  className?: string;
}

export class AuthService {
  // 生成JWT Token
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });
  }

  // 验证JWT Token
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }

  // 校友身份验证（学号+姓名）
  async verifyAlumniByStudentId(studentId: string, name: string): Promise<UserSession | null> {
    const alumni = await alumniRepository.findByStudentIdAndName(studentId, name);
    if (!alumni) return null;

    return {
      role: 'verified_alumni',
      alumniId: alumni.id,
      className: alumni.className,
    };
  }

  // 校友身份验证（手机号OTP）- 简化版，实际需要短信服务
  async verifyAlumniByPhone(phone: string, otp: string): Promise<UserSession | null> {
    // TODO: 实际实现需要验证OTP
    const result = await pool.query(
      'SELECT * FROM alumni_system.alumni WHERE phone = $1',
      [phone]
    );
    
    if (result.rows.length === 0) return null;

    const alumni = result.rows[0];
    return {
      role: 'verified_alumni',
      alumniId: alumni.id,
      className: alumni.class_name,
    };
  }

  // 管理员登录
  async adminLogin(username: string, password: string): Promise<{ token: string; user: any } | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM alumni_system.users WHERE username = $1 AND status = $2',
        [username, 'active']
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return null;

      // 使用数据库中的实际角色（admin 或 super_admin）
      const token = this.generateToken({
        userId: user.id,
        role: user.role === 'super_admin' ? 'super_admin' : 'admin',
        alumniId: user.alumni_id,
      });

      // 更新最后登录时间
      await pool.query(
        'UPDATE alumni_system.users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          displayName: user.display_name,
        },
      };
    } catch (error) {
      console.error('管理员登录失败:', error);
      return null;
    }
  }

  // 创建管理员账户
  async createAdmin(username: string, password: string, alumniId?: string): Promise<any> {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role, alumni_id)
       VALUES ($1, $2, 'admin', $3)
       RETURNING id, username, role`,
      [username, passwordHash, alumniId]
    );
    return result.rows[0];
  }

  // 获取Guest会话
  getGuestSession(): UserSession {
    return { role: 'guest' };
  }

  // 检查角色权限
  hasPermission(role: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<string, number> = {
      guest: 0,
      verified_alumni: 1,
      admin: 2,
      super_admin: 3,
    };
    return (roleHierarchy[role] ?? 0) >= (roleHierarchy[requiredRole] ?? 0);
  }

  // 检查是否为管理员（含 super_admin）
  isAdmin(role: string): boolean {
    return role === 'admin' || role === 'super_admin';
  }

  // ---- Refresh Token ----

  /** 生成 refresh token */
  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN_SECONDS });
  }

  /** 验证 refresh token，返回新 token 对 */
  refreshAccessToken(refreshToken: string): { token: string; refreshToken: string } | null {
    try {
      if (this.isBlacklisted(refreshToken)) return null;
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;
      const newToken = this.generateToken(payload);
      const newRefreshToken = this.generateRefreshToken(payload);
      // 旧 refresh token 加入黑名单
      this.blacklistToken(refreshToken, REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000);
      return { token: newToken, refreshToken: newRefreshToken };
    } catch {
      return null;
    }
  }

  /** 生成 token 对（登录时使用） */
  generateTokenPair(payload: TokenPayload): { token: string; refreshToken: string } {
    return {
      token: this.generateToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  // ---- Token 黑名单 ----

  /** 将 token 加入黑名单 */
  blacklistToken(token: string, ttlMs: number = JWT_EXPIRES_IN_SECONDS * 1000): void {
    tokenBlacklist.set(token, Date.now() + ttlMs);
    logger.info('Token 已加入黑名单');
  }

  /** 检查 token 是否在黑名单中 */
  isBlacklisted(token: string): boolean {
    const expires = tokenBlacklist.get(token);
    if (!expires) return false;
    if (expires < Date.now()) {
      tokenBlacklist.delete(token);
      return false;
    }
    return true;
  }

  /** 获取黑名单大小 */
  getBlacklistSize(): number {
    return tokenBlacklist.size;
  }
}

export const authService = new AuthService();

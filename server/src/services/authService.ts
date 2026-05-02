import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { alumniRepository } from '../repositories/alumniRepository';
import { UserRole, UserSession } from '../types/models';

const JWT_SECRET: Secret = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })();
// 默认7天过期，转换为秒
const JWT_EXPIRES_IN_SECONDS = parseInt(process.env.JWT_EXPIRES_IN_SECONDS || '604800', 10);

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
        'SELECT * FROM alumni_system.users WHERE username = $1',
        [username]
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return null;

      const token = this.generateToken({
        userId: user.id,
        role: 'admin',
        alumniId: user.alumni_id,
      });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('数据库查询失败:', error);
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
    const roleHierarchy: Record<UserRole, number> = {
      guest: 0,
      verified_alumni: 1,
      admin: 2,
    };
    return roleHierarchy[role] >= roleHierarchy[requiredRole];
  }
}

export const authService = new AuthService();

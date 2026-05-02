import { pool } from '../config/database';
import { Alumni, UserRole, VisibilityLevel, PrivacyHandshake, HandshakeStatus } from '../types/models';

export class PrivacyService {
  // 手机号脱敏
  maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    // 格式: 前3位 **** 后4位
    const prefix = phone.slice(0, 3);
    const suffix = phone.slice(-4);
    return `${prefix} **** ${suffix}`;
  }

  // 邮箱脱敏
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `**@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  // 根据角色和可见性设置过滤敏感数据
  filterSensitiveData(
    alumni: Alumni,
    viewerRole: UserRole,
    viewerClassName?: string
  ): Alumni {
    const result = { ...alumni };

    // Guest用户：所有敏感信息都脱敏
    if (viewerRole === 'guest') {
      if (result.phone) result.phone = this.maskPhone(result.phone);
      if (result.email) result.email = this.maskEmail(result.email);
      return result;
    }

    // 已验证校友：根据可见性设置处理
    if (viewerRole === 'verified_alumni') {
      const isSameClass = viewerClassName === alumni.className;

      // 手机号可见性
      if (result.phone) {
        if (result.phoneVisibility === 'private') {
          result.phone = this.maskPhone(result.phone);
        } else if (result.phoneVisibility === 'classmates_only' && !isSameClass) {
          result.phone = this.maskPhone(result.phone);
        }
        // public 或 同班同学可见时显示完整信息
      }

      // 邮箱可见性
      if (result.email) {
        if (result.emailVisibility === 'private') {
          result.email = this.maskEmail(result.email);
        } else if (result.emailVisibility === 'classmates_only' && !isSameClass) {
          result.email = this.maskEmail(result.email);
        }
      }
    }

    // Admin用户：可以看到所有信息
    return result;
  }

  // 批量过滤敏感数据
  filterSensitiveDataBatch(
    alumniList: Alumni[],
    viewerRole: UserRole,
    viewerClassName?: string
  ): Alumni[] {
    return alumniList.map(a => this.filterSensitiveData(a, viewerRole, viewerClassName));
  }

  // 发起隐私握手请求
  async initiateHandshake(
    requesterId: string,
    targetId: string,
    reason: string
  ): Promise<PrivacyHandshake> {
    const result = await pool.query(
      `INSERT INTO privacy_handshakes (requester_id, target_id, reason, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [requesterId, targetId, reason]
    );
    return this.rowToHandshake(result.rows[0]);
  }

  // 响应隐私握手请求
  async respondHandshake(
    handshakeId: string,
    status: 'approved' | 'rejected'
  ): Promise<PrivacyHandshake | null> {
    const result = await pool.query(
      `UPDATE privacy_handshakes 
       SET status = $1, responded_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [status, handshakeId]
    );
    return result.rows[0] ? this.rowToHandshake(result.rows[0]) : null;
  }

  // 获取待处理的握手请求
  async getPendingHandshakes(targetId: string): Promise<PrivacyHandshake[]> {
    const result = await pool.query(
      `SELECT * FROM privacy_handshakes 
       WHERE target_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [targetId]
    );
    return result.rows.map(this.rowToHandshake);
  }

  // 检查是否已有授权
  async hasAuthorization(requesterId: string, targetId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT 1 FROM privacy_handshakes 
       WHERE requester_id = $1 AND target_id = $2 AND status = 'approved'
       LIMIT 1`,
      [requesterId, targetId]
    );
    return result.rows.length > 0;
  }

  // 过期处理（超过7天未响应的请求自动过期）
  async expireOldHandshakes(): Promise<number> {
    const result = await pool.query(
      `UPDATE privacy_handshakes 
       SET status = 'expired'
       WHERE status = 'pending' 
         AND created_at < NOW() - INTERVAL '7 days'`
    );
    return result.rowCount ?? 0;
  }

  private rowToHandshake(row: any): PrivacyHandshake {
    return {
      id: row.id,
      requesterId: row.requester_id,
      targetId: row.target_id,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
    };
  }
}

export const privacyService = new PrivacyService();

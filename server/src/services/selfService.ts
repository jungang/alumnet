/**
 * 校友自助服务 — 校友登录后查看同班、更新信息、发起隐私握手
 */
import { pool } from '../config/database';
import logger from '../config/logger';

interface AlumniProfile {
  id: string;
  name: string;
  student_id: string | null;
  graduation_year: number | null;
  class_name: string | null;
  industry: string | null;
  biography: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  photo_url: string | null;
}

interface PrivacyHandshake {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester_name?: string;
  target_name?: string;
}

class SelfService {
  /** 通过学号或姓名+毕业年份查找自己的档案 */
  async findMyProfile(identifier: string, graduationYear?: number): Promise<AlumniProfile | null> {
    let query: string;
    let params: any[];

    if (graduationYear) {
      query = `
        SELECT id, name, student_id, graduation_year, class_name, industry, 
               biography, email, phone, title, photo_url
        FROM alumni_system.alumni 
        WHERE (name = $1 OR student_id = $1) AND graduation_year = $2
        LIMIT 1
      `;
      params = [identifier, graduationYear];
    } else {
      query = `
        SELECT id, name, student_id, graduation_year, class_name, industry,
               biography, email, phone, title, photo_url
        FROM alumni_system.alumni 
        WHERE name = $1 OR student_id = $1
        LIMIT 1
      `;
      params = [identifier];
    }

    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  /** 获取同班同学 */
  async getClassmates(alumniId: string): Promise<AlumniProfile[]> {
    // 先获取该校友的班级和毕业年份
    const alumniResult = await pool.query(
      'SELECT class_name, graduation_year FROM alumni_system.alumni WHERE id = $1',
      [alumniId]
    );
    if (!alumniResult.rows[0]) return [];

    const { class_name, graduation_year } = alumniResult.rows[0];
    if (!class_name && !graduation_year) return [];

    // 查找同班/同届校友（排除自己）
    const result = await pool.query(
      `SELECT id, name, student_id, graduation_year, class_name, industry, 
              biography, email, phone, title, photo_url
       FROM alumni_system.alumni 
       WHERE id != $1 AND (class_name = $2 OR graduation_year = $3)
       ORDER BY name
       LIMIT 50`,
      [alumniId, class_name, graduation_year]
    );
    return result.rows;
  }

  /** 更新自己的信息（限制可更新字段） */
  async updateMyProfile(alumniId: string, updates: Partial<Pick<AlumniProfile, 'industry' | 'biography' | 'email' | 'phone' | 'title'>>): Promise<AlumniProfile> {
    const allowedFields = ['industry', 'biography', 'email', 'phone', 'title'];
    const fields: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (updates[field as keyof typeof updates] !== undefined) {
        fields.push(field);
        values.push(updates[field as keyof typeof updates]);
      }
    }

    if (fields.length === 0) {
      throw new Error('没有可更新的字段');
    }

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE alumni_system.alumni SET ${setClauses} WHERE id = $${fields.length + 1}
       RETURNING id, name, student_id, graduation_year, class_name, industry, biography, email, phone, title, photo_url`,
      [...values, alumniId]
    );

    logger.info({ alumniId, fields }, '校友自助更新信息');
    return result.rows[0];
  }

  /** 发起隐私握手（请求查看另一位校友的联系方式） */
  async requestHandshake(requesterId: string, targetId: string): Promise<PrivacyHandshake> {
    if (requesterId === targetId) {
      throw new Error('不能向自己发起握手');
    }

    // 检查是否已存在
    const existing = await pool.query(
      `SELECT id, status FROM alumni_system.privacy_handshakes 
       WHERE requester_id = $1 AND target_id = $2 AND status = 'pending'`,
      [requesterId, targetId]
    );
    if (existing.rows[0]) {
      throw new Error('已有待处理的握手请求');
    }

    const result = await pool.query(
      `INSERT INTO alumni_system.privacy_handshakes (requester_id, target_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, requester_id, target_id, status, created_at`,
      [requesterId, targetId]
    );

    logger.info({ requesterId, targetId }, '隐私握手请求');
    return result.rows[0];
  }

  /** 响应握手（接受/拒绝） */
  async respondHandshake(handshakeId: string, responderId: string, accept: boolean): Promise<PrivacyHandshake> {
    const status = accept ? 'accepted' : 'rejected';
    const result = await pool.query(
      `UPDATE alumni_system.privacy_handshakes 
       SET status = $1, responded_at = NOW()
       WHERE id = $2 AND target_id = $3 AND status = 'pending'
       RETURNING id, requester_id, target_id, status, created_at`,
      [status, handshakeId, responderId]
    );

    if (!result.rows[0]) {
      throw new Error('握手请求不存在或已处理');
    }

    logger.info({ handshakeId, status }, '隐私握手响应');
    return result.rows[0];
  }

  /** 获取我收到的握手请求 */
  async getIncomingHandshakes(alumniId: string): Promise<PrivacyHandshake[]> {
    const result = await pool.query(
      `SELECT h.id, h.requester_id, h.target_id, h.status, h.created_at,
              r.name as requester_name
       FROM alumni_system.privacy_handshakes h
       JOIN alumni_system.alumni r ON r.id = h.requester_id
       WHERE h.target_id = $1
       ORDER BY h.created_at DESC
       LIMIT 50`,
      [alumniId]
    );
    return result.rows;
  }

  /** 获取我发出的握手请求 */
  async getOutgoingHandshakes(alumniId: string): Promise<PrivacyHandshake[]> {
    const result = await pool.query(
      `SELECT h.id, h.requester_id, h.target_id, h.status, h.created_at,
              t.name as target_name
       FROM alumni_system.privacy_handshakes h
       JOIN alumni_system.alumni t ON t.id = h.target_id
       WHERE h.requester_id = $1
       ORDER BY h.created_at DESC
       LIMIT 50`,
      [alumniId]
    );
    return result.rows;
  }
}

export const selfService = new SelfService();

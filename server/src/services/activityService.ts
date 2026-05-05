/**
 * 校友活动/聚会服务
 * 活动发布 → 报名 → 签到 → 回顾闭环
 */
import { pool } from '../config/database';
import logger from '../config/logger';

interface Activity {
  id: string;
  title: string;
  description: string;
  type: 'reunion' | 'lecture' | 'social' | 'volunteer' | 'other';
  location: string;
  start_time: string;
  end_time: string;
  capacity: number;
  registered_count: number;
  status: 'draft' | 'open' | 'closed' | 'completed';
  creator_id: string;
  created_at: string;
}

interface Registration {
  id: string;
  activity_id: string;
  alumni_id: string;
  alumni_name: string;
  status: 'registered' | 'checked_in' | 'cancelled';
  registered_at: string;
}

class ActivityService {
  /** 创建活动 */
  async create(data: Partial<Activity> & { creator_id: string }): Promise<Activity> {
    const result = await pool.query(
      `INSERT INTO alumni_system.activities 
       (title, description, type, location, start_time, end_time, capacity, status, creator_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)
       RETURNING *`,
      [data.title, data.description, data.type || 'other', data.location,
       data.start_time, data.end_time, data.capacity || 100, data.creator_id]
    );
    logger.info({ activity: result.rows[0].id }, '活动已创建');
    return result.rows[0];
  }

  /** 获取活动列表 */
  async list(status?: string): Promise<Activity[]> {
    const query = status
      ? 'SELECT * FROM alumni_system.activities WHERE status = $1 ORDER BY start_time DESC'
      : 'SELECT * FROM alumni_system.activities ORDER BY start_time DESC';
    const result = await pool.query(query, status ? [status] : []);
    return result.rows;
  }

  /** 获取活动详情 */
  async getById(id: string): Promise<Activity | null> {
    const result = await pool.query('SELECT * FROM alumni_system.activities WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /** 报名 */
  async register(activityId: string, alumniId: string, alumniName: string): Promise<Registration> {
    // 检查是否已报名
    const existing = await pool.query(
      'SELECT id FROM alumni_system.activity_registrations WHERE activity_id = $1 AND alumni_id = $2',
      [activityId, alumniId]
    );
    if (existing.rows[0]) throw new Error('已报名此活动');

    // 检查容量
    const activity = await this.getById(activityId);
    if (!activity) throw new Error('活动不存在');
    if (activity.status !== 'open') throw new Error('活动不在报名状态');
    if (activity.registered_count >= activity.capacity) throw new Error('活动已满');

    const result = await pool.query(
      `INSERT INTO alumni_system.activity_registrations (activity_id, alumni_id, alumni_name, status)
       VALUES ($1, $2, $3, 'registered') RETURNING *`,
      [activityId, alumniId, alumniName]
    );

    await pool.query(
      'UPDATE alumni_system.activities SET registered_count = registered_count + 1 WHERE id = $1',
      [activityId]
    );

    logger.info({ activityId, alumniId }, '活动报名');
    return result.rows[0];
  }

  /** 取消报名 */
  async cancelRegistration(activityId: string, alumniId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE alumni_system.activity_registrations SET status = 'cancelled'
       WHERE activity_id = $1 AND alumni_id = $2 AND status = 'registered'`,
      [activityId, alumniId]
    );
    if ((result.rowCount ?? 0) > 0) {
      await pool.query(
        'UPDATE alumni_system.activities SET registered_count = GREATEST(registered_count - 1, 0) WHERE id = $1',
        [activityId]
      );
    }
  }

  /** 签到 */
  async checkIn(activityId: string, alumniId: string): Promise<void> {
    await pool.query(
      `UPDATE alumni_system.activity_registrations SET status = 'checked_in'
       WHERE activity_id = $1 AND alumni_id = $2 AND status = 'registered'`,
      [activityId, alumniId]
    );
  }

  /** 获取报名列表 */
  async getRegistrations(activityId: string): Promise<Registration[]> {
    const result = await pool.query(
      'SELECT * FROM alumni_system.activity_registrations WHERE activity_id = $1 ORDER BY registered_at',
      [activityId]
    );
    return result.rows;
  }

  /** 更新活动 */
  async update(id: string, data: Partial<Activity>): Promise<Activity> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    }
    if (fields.length === 0) throw new Error('没有可更新的字段');

    values.push(id);
    const result = await pool.query(
      `UPDATE alumni_system.activities SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }
}

export const activityService = new ActivityService();

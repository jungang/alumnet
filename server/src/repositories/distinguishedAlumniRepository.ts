import { pool } from '../config/database';
import { DistinguishedAlumni, TimelineEvent, ListResponse } from '../types/models';

export interface DistinguishedAlumniWithInfo extends DistinguishedAlumni {
  id: string;
  name: string;
  graduationYear: number;
  className: string;
  photoUrl?: string;
}

export interface DistinguishedSearchCriteria {
  keyword?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

// 数据库行转换为DistinguishedAlumniWithInfo对象
function rowToDistinguished(row: any): DistinguishedAlumniWithInfo {
  return {
    id: row.id,
    alumniId: row.alumni_id,
    category: row.category,
    achievement: row.achievement,
    biography: row.biography || '',
    videoUrl: row.video_url,
    popularity: row.popularity || 0,
    timeline: row.timeline || [],
    name: row.name,
    graduationYear: row.graduation_year,
    className: row.class_name,
    photoUrl: row.photo_url ? `${row.photo_url}?t=${new Date(row.updated_at || row.created_at).getTime()}` : row.photo_url,
  };
}

export class DistinguishedAlumniRepository {
  // 获取杰出校友列表
  async findAll(criteria: DistinguishedSearchCriteria): Promise<ListResponse<DistinguishedAlumniWithInfo>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.keyword) {
      conditions.push(`(a.name ILIKE $${paramIndex} OR d.achievement ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    if (criteria.category) {
      conditions.push(`d.category = $${paramIndex++}`);
      params.push(criteria.category);
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.distinguished_alumni d
       JOIN alumni_system.alumni a ON d.alumni_id = a.id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 分页参数
    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // 查询数据
    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT d.*, a.name, a.graduation_year, a.class_name, a.photo_url, a.biography
       FROM alumni_system.distinguished_alumni d
       JOIN alumni_system.alumni a ON d.alumni_id = a.id
       WHERE ${whereClause}
       ORDER BY d.popularity DESC, d.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return {
      items: dataResult.rows.map(rowToDistinguished),
      total,
    };
  }

  // 根据ID查询
  async findById(id: string): Promise<DistinguishedAlumniWithInfo | null> {
    const result = await pool.query(
      `SELECT d.*, a.name, a.graduation_year, a.class_name, a.photo_url, a.biography
       FROM alumni_system.distinguished_alumni d
       JOIN alumni_system.alumni a ON d.alumni_id = a.id
       WHERE d.id = $1`,
      [id]
    );
    return result.rows[0] ? rowToDistinguished(result.rows[0]) : null;
  }

  // 根据校友ID查询
  async findByAlumniId(alumniId: string): Promise<DistinguishedAlumniWithInfo | null> {
    const result = await pool.query(
      `SELECT d.*, a.name, a.graduation_year, a.class_name, a.photo_url, a.biography
       FROM alumni_system.distinguished_alumni d
       JOIN alumni_system.alumni a ON d.alumni_id = a.id
       WHERE d.alumni_id = $1`,
      [alumniId]
    );
    return result.rows[0] ? rowToDistinguished(result.rows[0]) : null;
  }

  // 创建杰出校友
  async create(data: {
    alumniId: string;
    category: string;
    achievement?: string;
    videoUrl?: string;
    popularity?: number;
    timeline?: TimelineEvent[];
  }): Promise<DistinguishedAlumniWithInfo> {
    const result = await pool.query(
      `INSERT INTO alumni_system.distinguished_alumni 
       (alumni_id, category, achievement, video_url, popularity, timeline)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.alumniId,
        data.category,
        data.achievement || '',
        data.videoUrl || null,
        data.popularity || 0,
        JSON.stringify(data.timeline || []),
      ]
    );
    return this.findById(result.rows[0].id) as Promise<DistinguishedAlumniWithInfo>;
  }

  // 更新杰出校友
  async update(id: string, data: {
    category?: string;
    achievement?: string;
    videoUrl?: string;
    popularity?: number;
    timeline?: TimelineEvent[];
  }): Promise<DistinguishedAlumniWithInfo | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      params.push(data.category);
    }
    if (data.achievement !== undefined) {
      fields.push(`achievement = $${paramIndex++}`);
      params.push(data.achievement);
    }
    if (data.videoUrl !== undefined) {
      fields.push(`video_url = $${paramIndex++}`);
      params.push(data.videoUrl);
    }
    if (data.popularity !== undefined) {
      fields.push(`popularity = $${paramIndex++}`);
      params.push(data.popularity);
    }
    if (data.timeline !== undefined) {
      fields.push(`timeline = $${paramIndex++}`);
      params.push(JSON.stringify(data.timeline));
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    await pool.query(
      `UPDATE alumni_system.distinguished_alumni SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      params
    );
    return this.findById(id);
  }

  // 删除杰出校友（保留基础校友信息）
  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.distinguished_alumni WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // 获取所有类别
  async getCategories(): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT category FROM alumni_system.distinguished_alumni ORDER BY category'
    );
    return result.rows.map(row => row.category);
  }

  // 检查校友是否已是杰出校友
  async existsByAlumniId(alumniId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM alumni_system.distinguished_alumni WHERE alumni_id = $1',
      [alumniId]
    );
    return result.rows.length > 0;
  }
}

export const distinguishedAlumniRepository = new DistinguishedAlumniRepository();

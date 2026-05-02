import { pool } from '../config/database';
import { TopScholar, CreateTopScholarDto, UpdateTopScholarDto } from '../types/models';

export const topScholarRepository = {
  /**
   * 获取所有状元（按年份降序）
   */
  async findAll(): Promise<TopScholar[]> {
    const result = await pool.query(`
      SELECT id, name, exam_year, rank_description, university, major, score,
             photo_url, biography, alumni_id, sort_order, is_deleted,
             created_at, updated_at
      FROM alumni_system.top_scholars
      WHERE is_deleted = FALSE
      ORDER BY exam_year DESC, sort_order DESC
    `);
    return result.rows.map(mapRowToTopScholar);
  },

  /**
   * 分页获取状元列表
   */
  async findPaginated(params: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TopScholar[]; total: number }> {
    const { keyword = '', page = 1, pageSize = 20 } = params;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE is_deleted = FALSE';
    const queryParams: any[] = [];

    if (keyword) {
      queryParams.push(`%${keyword}%`);
      whereClause += ` AND (name ILIKE $${queryParams.length} OR university ILIKE $${queryParams.length} OR rank_description ILIKE $${queryParams.length})`;
    }

    // 获取总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.top_scholars ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // 获取分页数据
    queryParams.push(pageSize, offset);
    const result = await pool.query(`
      SELECT id, name, exam_year, rank_description, university, major, score,
             photo_url, biography, alumni_id, sort_order, is_deleted,
             created_at, updated_at
      FROM alumni_system.top_scholars
      ${whereClause}
      ORDER BY exam_year DESC, sort_order DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `, queryParams);

    return {
      items: result.rows.map(mapRowToTopScholar),
      total,
    };
  },


  /**
   * 根据ID获取状元
   */
  async findById(id: string): Promise<TopScholar | null> {
    const result = await pool.query(`
      SELECT id, name, exam_year, rank_description, university, major, score,
             photo_url, biography, alumni_id, sort_order, is_deleted,
             created_at, updated_at
      FROM alumni_system.top_scholars
      WHERE id = $1 AND is_deleted = FALSE
    `, [id]);
    
    if (result.rows.length === 0) return null;
    return mapRowToTopScholar(result.rows[0]);
  },

  /**
   * 创建状元
   */
  async create(data: CreateTopScholarDto): Promise<TopScholar> {
    const result = await pool.query(`
      INSERT INTO alumni_system.top_scholars 
        (name, exam_year, rank_description, university, major, score, photo_url, biography, alumni_id, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, exam_year, rank_description, university, major, score,
                photo_url, biography, alumni_id, sort_order, is_deleted,
                created_at, updated_at
    `, [
      data.name,
      data.examYear,
      data.rankDescription,
      data.university || null,
      data.major || null,
      data.score || null,
      data.photoUrl || null,
      data.biography || null,
      data.alumniId || null,
      data.sortOrder || 0,
    ]);
    return mapRowToTopScholar(result.rows[0]);
  },

  /**
   * 更新状元
   */
  async update(id: string, data: UpdateTopScholarDto): Promise<TopScholar | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.examYear !== undefined) {
      fields.push(`exam_year = $${paramIndex++}`);
      values.push(data.examYear);
    }
    if (data.rankDescription !== undefined) {
      fields.push(`rank_description = $${paramIndex++}`);
      values.push(data.rankDescription);
    }
    if (data.university !== undefined) {
      fields.push(`university = $${paramIndex++}`);
      values.push(data.university);
    }
    if (data.major !== undefined) {
      fields.push(`major = $${paramIndex++}`);
      values.push(data.major);
    }
    if (data.score !== undefined) {
      fields.push(`score = $${paramIndex++}`);
      values.push(data.score);
    }
    if (data.photoUrl !== undefined) {
      fields.push(`photo_url = $${paramIndex++}`);
      values.push(data.photoUrl);
    }
    if (data.biography !== undefined) {
      fields.push(`biography = $${paramIndex++}`);
      values.push(data.biography);
    }
    if (data.alumniId !== undefined) {
      fields.push(`alumni_id = $${paramIndex++}`);
      values.push(data.alumniId);
    }
    if (data.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramIndex++}`);
      values.push(data.sortOrder);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(`
      UPDATE alumni_system.top_scholars
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND is_deleted = FALSE
      RETURNING id, name, exam_year, rank_description, university, major, score,
                photo_url, biography, alumni_id, sort_order, is_deleted,
                created_at, updated_at
    `, values);

    if (result.rows.length === 0) return null;
    return mapRowToTopScholar(result.rows[0]);
  },

  /**
   * 软删除状元
   */
  async delete(id: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE alumni_system.top_scholars
      SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = FALSE
    `, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  },

  /**
   * 根据姓名查找状元
   */
  async findByName(name: string): Promise<TopScholar | null> {
    const result = await pool.query(`
      SELECT id, name, exam_year, rank_description, university, major, score,
             photo_url, biography, alumni_id, sort_order, is_deleted,
             created_at, updated_at
      FROM alumni_system.top_scholars
      WHERE name = $1 AND is_deleted = FALSE
    `, [name]);
    
    if (result.rows.length === 0) return null;
    return mapRowToTopScholar(result.rows[0]);
  },
};

function mapRowToTopScholar(row: any): TopScholar {
  return {
    id: row.id,
    name: row.name,
    examYear: row.exam_year,
    rankDescription: row.rank_description,
    university: row.university,
    major: row.major,
    score: row.score,
    photoUrl: row.photo_url ? `${row.photo_url}?t=${new Date(row.updated_at || row.created_at).getTime()}` : row.photo_url,
    biography: row.biography,
    alumniId: row.alumni_id,
    sortOrder: row.sort_order,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

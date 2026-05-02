import { pool } from '../config/database';
import { GraduationPhoto, FaceTag, ListResponse } from '../types/models';

export interface PhotoSearchCriteria {
  year?: number;
  className?: string;
  page?: number;
  pageSize?: number;
}

// 数据库行转换为GraduationPhoto对象
function rowToPhoto(row: any): GraduationPhoto {
  return {
    id: row.id,
    year: row.year,
    className: row.class_name,
    originalUrl: row.original_url,
    restoredUrl: row.restored_url,
    faceTags: row.face_tags || [],
  };
}

export class GraduationPhotoRepository {
  // 获取毕业照列表
  async findAll(criteria: PhotoSearchCriteria): Promise<ListResponse<GraduationPhoto>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.year) {
      conditions.push(`year = $${paramIndex++}`);
      params.push(criteria.year);
    }

    if (criteria.className) {
      conditions.push(`class_name ILIKE $${paramIndex++}`);
      params.push(`%${criteria.className}%`);
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.graduation_photos WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 分页参数
    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    // 查询数据
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.graduation_photos 
       WHERE ${whereClause}
       ORDER BY year DESC, class_name ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return {
      items: dataResult.rows.map(rowToPhoto),
      total,
    };
  }

  // 根据ID查询
  async findById(id: string): Promise<GraduationPhoto | null> {
    const result = await pool.query(
      'SELECT * FROM alumni_system.graduation_photos WHERE id = $1',
      [id]
    );
    return result.rows[0] ? rowToPhoto(result.rows[0]) : null;
  }

  // 创建毕业照
  async create(data: {
    year: number;
    className?: string;
    originalUrl: string;
    restoredUrl?: string;
    faceTags?: FaceTag[];
  }): Promise<GraduationPhoto> {
    const result = await pool.query(
      `INSERT INTO alumni_system.graduation_photos 
       (year, class_name, original_url, restored_url, face_tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.year,
        data.className || null,
        data.originalUrl,
        data.restoredUrl || null,
        JSON.stringify(data.faceTags || []),
      ]
    );
    return rowToPhoto(result.rows[0]);
  }

  // 更新毕业照
  async update(id: string, data: {
    year?: number;
    className?: string;
    originalUrl?: string;
    restoredUrl?: string;
  }): Promise<GraduationPhoto | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.year !== undefined) {
      fields.push(`year = $${paramIndex++}`);
      params.push(data.year);
    }
    if (data.className !== undefined) {
      fields.push(`class_name = $${paramIndex++}`);
      params.push(data.className);
    }
    if (data.originalUrl !== undefined) {
      fields.push(`original_url = $${paramIndex++}`);
      params.push(data.originalUrl);
    }
    if (data.restoredUrl !== undefined) {
      fields.push(`restored_url = $${paramIndex++}`);
      params.push(data.restoredUrl);
    }

    if (fields.length === 0) return this.findById(id);

    params.push(id);
    const result = await pool.query(
      `UPDATE alumni_system.graduation_photos SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0] ? rowToPhoto(result.rows[0]) : null;
  }

  // 更新人脸标记
  async updateFaceTags(id: string, faceTags: FaceTag[]): Promise<GraduationPhoto | null> {
    const result = await pool.query(
      `UPDATE alumni_system.graduation_photos SET face_tags = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(faceTags), id]
    );
    return result.rows[0] ? rowToPhoto(result.rows[0]) : null;
  }

  // 删除毕业照
  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.graduation_photos WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // 获取所有年份
  async getDistinctYears(): Promise<number[]> {
    const result = await pool.query(
      'SELECT DISTINCT year FROM alumni_system.graduation_photos ORDER BY year DESC'
    );
    return result.rows.map(row => row.year);
  }

  // 获取所有班级
  async getDistinctClasses(): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT class_name FROM alumni_system.graduation_photos WHERE class_name IS NOT NULL ORDER BY class_name'
    );
    return result.rows.map(row => row.class_name);
  }
}

export const graduationPhotoRepository = new GraduationPhotoRepository();

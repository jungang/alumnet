import { pool } from '../config/database';
import { AlumniNews, AlumniNewsType, AlumniNewsStatus, ListResponse } from '../types/models';

export interface NewsSearchCriteria {
  newsType?: AlumniNewsType;
  status?: AlumniNewsStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

function rowToNews(row: any): AlumniNews {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    alumniId: row.alumni_id,
    alumniName: row.alumni_name,
    newsType: row.news_type,
    publishDate: row.publish_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AlumniNewsRepository {
  async findAll(criteria: NewsSearchCriteria): Promise<ListResponse<AlumniNews>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.newsType) {
      conditions.push(`news_type = $${paramIndex++}`);
      params.push(criteria.newsType);
    }
    if (criteria.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(criteria.status);
    }
    if (criteria.keyword) {
      conditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.alumni_news WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.alumni_news WHERE ${whereClause}
       ORDER BY publish_date DESC NULLS LAST, created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );
    return { items: dataResult.rows.map(rowToNews), total };
  }

  async findById(id: string): Promise<AlumniNews | null> {
    const result = await pool.query(
      'SELECT * FROM alumni_system.alumni_news WHERE id = $1',
      [id]
    );
    return result.rows[0] ? rowToNews(result.rows[0]) : null;
  }

  async create(data: Partial<AlumniNews>): Promise<AlumniNews> {
    const result = await pool.query(
      `INSERT INTO alumni_system.alumni_news (title, content, alumni_id, alumni_name, news_type, publish_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.title, data.content, data.alumniId, data.alumniName, data.newsType, data.publishDate, data.status || 'draft']
    );
    return rowToNews(result.rows[0]);
  }

  async update(id: string, data: Partial<AlumniNews>): Promise<AlumniNews | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      params.push(data.content);
    }
    if (data.alumniId !== undefined) {
      fields.push(`alumni_id = $${paramIndex++}`);
      params.push(data.alumniId);
    }
    if (data.alumniName !== undefined) {
      fields.push(`alumni_name = $${paramIndex++}`);
      params.push(data.alumniName);
    }
    if (data.newsType !== undefined) {
      fields.push(`news_type = $${paramIndex++}`);
      params.push(data.newsType);
    }
    if (data.publishDate !== undefined) {
      fields.push(`publish_date = $${paramIndex++}`);
      params.push(data.publishDate);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (fields.length === 0) return this.findById(id);
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const result = await pool.query(
      `UPDATE alumni_system.alumni_news SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0] ? rowToNews(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.alumni_news WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const alumniNewsRepository = new AlumniNewsRepository();

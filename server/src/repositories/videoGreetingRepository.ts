import { pool } from '../config/database';
import { VideoGreeting, VideoGreetingStatus, ListResponse } from '../types/models';

export interface VideoGreetingSearchCriteria {
  status?: VideoGreetingStatus;
  alumniId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

function rowToVideoGreeting(row: any): VideoGreeting {
  return {
    id: row.id,
    alumniId: row.alumni_id,
    alumniName: row.alumni_name,
    alumniClass: row.alumni_class,
    title: row.title,
    description: row.description,
    videoUrl: row.video_url,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    viewCount: row.view_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class VideoGreetingRepository {
  async findAll(criteria: VideoGreetingSearchCriteria): Promise<ListResponse<VideoGreeting>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(criteria.status);
    }
    if (criteria.alumniId) {
      conditions.push(`alumni_id = $${paramIndex++}`);
      params.push(criteria.alumniId);
    }
    if (criteria.keyword) {
      conditions.push(`(title ILIKE $${paramIndex} OR alumni_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.video_greetings WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.video_greetings WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToVideoGreeting), total };
  }

  async findPublic(page: number = 1, pageSize: number = 20): Promise<ListResponse<VideoGreeting>> {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.video_greetings WHERE status IN ('approved', 'featured')`
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.video_greetings 
       WHERE status IN ('approved', 'featured')
       ORDER BY CASE WHEN status = 'featured' THEN 0 ELSE 1 END, created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToVideoGreeting), total };
  }

  async findFeatured(limit: number = 5): Promise<VideoGreeting[]> {
    const result = await pool.query(
      `SELECT * FROM alumni_system.video_greetings 
       WHERE status = 'featured'
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(rowToVideoGreeting);
  }

  async findById(id: string): Promise<VideoGreeting | null> {
    const result = await pool.query(
      'SELECT * FROM alumni_system.video_greetings WHERE id = $1',
      [id]
    );
    return result.rows[0] ? rowToVideoGreeting(result.rows[0]) : null;
  }

  async create(data: Partial<VideoGreeting>): Promise<VideoGreeting> {
    const result = await pool.query(
      `INSERT INTO alumni_system.video_greetings 
       (alumni_id, alumni_name, alumni_class, title, description, video_url, thumbnail_url, duration_seconds, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.alumniId || null,
        data.alumniName,
        data.alumniClass || null,
        data.title,
        data.description || null,
        data.videoUrl,
        data.thumbnailUrl || null,
        data.durationSeconds || null,
        'pending'
      ]
    );
    return rowToVideoGreeting(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: VideoGreetingStatus,
    rejectionReason?: string,
    reviewedBy?: string
  ): Promise<VideoGreeting | null> {
    const result = await pool.query(
      `UPDATE alumni_system.video_greetings 
       SET status = $1, rejection_reason = $2, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $3
       WHERE id = $4
       RETURNING *`,
      [status, rejectionReason || null, reviewedBy || null, id]
    );
    return result.rows[0] ? rowToVideoGreeting(result.rows[0]) : null;
  }

  async setFeatured(id: string, featured: boolean): Promise<VideoGreeting | null> {
    const newStatus = featured ? 'featured' : 'approved';
    const result = await pool.query(
      `UPDATE alumni_system.video_greetings 
       SET status = $1
       WHERE id = $2 AND status IN ('approved', 'featured')
       RETURNING *`,
      [newStatus, id]
    );
    return result.rows[0] ? rowToVideoGreeting(result.rows[0]) : null;
  }

  async incrementViewCount(id: string): Promise<void> {
    await pool.query(
      `UPDATE alumni_system.video_greetings 
       SET view_count = view_count + 1
       WHERE id = $1`,
      [id]
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.video_greetings WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    featured: number;
    rejected: number;
    totalViews: number;
  }> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'featured') as featured,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COALESCE(SUM(view_count), 0) as total_views
      FROM alumni_system.video_greetings
    `);
    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      pending: parseInt(row.pending),
      approved: parseInt(row.approved),
      featured: parseInt(row.featured),
      rejected: parseInt(row.rejected),
      totalViews: parseInt(row.total_views),
    };
  }
}

export const videoGreetingRepository = new VideoGreetingRepository();

import { pool } from '../config/database';
import { 
  SearchNoticeStatus, 
  ListResponse,
  ContactPreference,
  SearchNoticeExtended,
  SearchNoticeCreateData
} from '../types/models';

export interface NoticeSearchCriteria {
  status?: SearchNoticeStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

function rowToNotice(row: any): SearchNoticeExtended {
  return {
    id: row.id,
    publisherId: row.publisher_id,
    targetName: row.target_name,
    targetClass: row.target_class,
    description: row.description,
    story: row.story,
    status: row.status,
    createdAt: row.created_at,
    contactPreference: row.contact_preference || 'system',
    reunionStory: row.reunion_story,
    lastReminderAt: row.last_reminder_at,
    publisherName: row.publisher_name,
    publisherClass: row.publisher_class,
  };
}

export class SearchNoticeRepository {
  async findAll(criteria: NoticeSearchCriteria): Promise<ListResponse<SearchNoticeExtended>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.status) {
      conditions.push(`sn.status = $${paramIndex++}`);
      params.push(criteria.status);
    }
    if (criteria.keyword) {
      conditions.push(`(sn.target_name ILIKE $${paramIndex} OR sn.description ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.search_notices sn WHERE ${whereClause}`, 
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT sn.*, a.name as publisher_name, a.class_name as publisher_class
       FROM alumni_system.search_notices sn
       LEFT JOIN alumni_system.alumni a ON sn.publisher_id = a.id
       WHERE ${whereClause}
       ORDER BY 
         CASE WHEN sn.status = 'active' THEN 0 ELSE 1 END,
         sn.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToNotice), total };
  }

  async findPublic(page: number = 1, pageSize: number = 20): Promise<ListResponse<SearchNoticeExtended>> {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.search_notices WHERE status IN ('active', 'found')`
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const dataResult = await pool.query(
      `SELECT sn.*, a.name as publisher_name, a.class_name as publisher_class
       FROM alumni_system.search_notices sn
       LEFT JOIN alumni_system.alumni a ON sn.publisher_id = a.id
       WHERE sn.status IN ('active', 'found')
       ORDER BY 
         CASE WHEN sn.status = 'active' THEN 0 ELSE 1 END,
         sn.created_at DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToNotice), total };
  }

  async search(keyword: string, page: number = 1, pageSize: number = 20): Promise<ListResponse<SearchNoticeExtended>> {
    const searchPattern = `%${keyword}%`;
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.search_notices 
       WHERE status IN ('active', 'found')
       AND (target_name ILIKE $1 OR target_class ILIKE $1 OR description ILIKE $1)`,
      [searchPattern]
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const dataResult = await pool.query(
      `SELECT sn.*, a.name as publisher_name, a.class_name as publisher_class
       FROM alumni_system.search_notices sn
       LEFT JOIN alumni_system.alumni a ON sn.publisher_id = a.id
       WHERE sn.status IN ('active', 'found')
       AND (sn.target_name ILIKE $1 OR sn.target_class ILIKE $1 OR sn.description ILIKE $1)
       ORDER BY 
         CASE WHEN sn.status = 'active' THEN 0 ELSE 1 END,
         sn.created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchPattern, pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToNotice), total };
  }

  async findById(id: string): Promise<SearchNoticeExtended | null> {
    const result = await pool.query(
      `SELECT sn.*, a.name as publisher_name, a.class_name as publisher_class
       FROM alumni_system.search_notices sn
       LEFT JOIN alumni_system.alumni a ON sn.publisher_id = a.id
       WHERE sn.id = $1`, 
      [id]
    );
    return result.rows[0] ? rowToNotice(result.rows[0]) : null;
  }

  async create(data: SearchNoticeCreateData): Promise<SearchNoticeExtended> {
    const result = await pool.query(
      `INSERT INTO alumni_system.search_notices 
       (publisher_id, target_name, target_class, description, story, contact_preference, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [
        data.publisherId,
        data.targetName,
        data.targetClass || null,
        data.description,
        data.story || null,
        data.contactPreference || 'system',
      ]
    );
    return rowToNotice(result.rows[0]);
  }

  async updateStatus(
    id: string, 
    status: SearchNoticeStatus,
    reunionStory?: string
  ): Promise<SearchNoticeExtended | null> {
    const result = await pool.query(
      `UPDATE alumni_system.search_notices 
       SET status = $1, reunion_story = COALESCE($2, reunion_story)
       WHERE id = $3 
       RETURNING *`,
      [status, reunionStory || null, id]
    );
    return result.rows[0] ? rowToNotice(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.search_notices WHERE id = $1', 
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    found: number;
    closed: number;
  }> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'found') as found,
        COUNT(*) FILTER (WHERE status = 'closed') as closed
      FROM alumni_system.search_notices
    `);
    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      active: parseInt(row.active),
      found: parseInt(row.found),
      closed: parseInt(row.closed),
    };
  }

  async findLongActiveNotices(daysThreshold: number = 365): Promise<SearchNoticeExtended[]> {
    const result = await pool.query(
      `SELECT sn.*, a.name as publisher_name, a.class_name as publisher_class
       FROM alumni_system.search_notices sn
       LEFT JOIN alumni_system.alumni a ON sn.publisher_id = a.id
       WHERE sn.status = 'active'
       AND sn.created_at < NOW() - INTERVAL '1 day' * $1
       AND (sn.last_reminder_at IS NULL OR sn.last_reminder_at < NOW() - INTERVAL '30 days')`,
      [daysThreshold]
    );
    return result.rows.map(rowToNotice);
  }

  async updateLastReminderAt(id: string): Promise<void> {
    await pool.query(
      `UPDATE alumni_system.search_notices SET last_reminder_at = NOW() WHERE id = $1`,
      [id]
    );
  }
}

export const searchNoticeRepository = new SearchNoticeRepository();

import { pool } from '../config/database';
import { 
  MessageStatus, 
  ListResponse, 
  BatchReviewRequest,
  MessageCategory,
  MessageDetailWithCategory,
  MessageCategoryStats,
  MessageCreateData
} from '../types/models';

export interface MessageSearchCriteria {
  status?: MessageStatus;
  category?: MessageCategory;
  keyword?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

function rowToMessageWithCategory(row: any): MessageDetailWithCategory {
  return {
    id: row.id,
    content: row.content,
    handwritingImageUrl: row.handwriting_image_url,
    authorName: row.author_name,
    authorClass: row.author_class,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    category: row.category || 'school',
    rejectionReason: row.rejection_reason,
  };
}

export class MessageRepository {
  async findAll(criteria: MessageSearchCriteria): Promise<ListResponse<MessageDetailWithCategory>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.status) { 
      conditions.push(`status = $${paramIndex++}`); 
      params.push(criteria.status); 
    }
    if (criteria.category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(criteria.category);
    }
    if (criteria.keyword) {
      conditions.push(`(content ILIKE $${paramIndex} OR author_name ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`); 
      paramIndex++;
    }
    if (criteria.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(criteria.startDate);
    }
    if (criteria.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(criteria.endDate);
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.messages WHERE ${whereClause}`, 
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.messages WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );
    return { items: dataResult.rows.map(rowToMessageWithCategory), total };
  }

  async findPublicByCategory(
    category?: MessageCategory, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<ListResponse<MessageDetailWithCategory>> {
    const conditions: string[] = ["status = 'approved'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(category);
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.messages WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * pageSize;
    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.messages WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToMessageWithCategory), total };
  }

  async getCategoryStats(): Promise<MessageCategoryStats[]> {
    try {
      const result = await pool.query(`
        SELECT category, COUNT(*) as count
        FROM alumni_system.messages
        WHERE status = 'approved'
        GROUP BY category
      `);
      return result.rows.map(row => ({
        category: row.category || 'school',
        count: parseInt(row.count),
      }));
    } catch (error) {
      // 如果category字段不存在，返回模拟数据
      console.warn('获取留言分类统计失败，可能缺少category字段:', error);
      return [
        { category: 'school', count: 0 },
        { category: 'teacher', count: 0 },
        { category: 'classmate', count: 0 }
      ];
    }
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM alumni_system.messages
    `);
    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      pending: parseInt(row.pending),
      approved: parseInt(row.approved),
      rejected: parseInt(row.rejected),
    };
  }

  async create(data: MessageCreateData): Promise<MessageDetailWithCategory> {
    const result = await pool.query(
      `INSERT INTO alumni_system.messages 
       (content, category, author_id, author_name, author_class, handwriting_image_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        data.content,
        data.category || 'school',
        data.authorId || null,
        data.authorName || null,
        data.authorClass || null,
        data.handwritingImageUrl || null,
      ]
    );
    return rowToMessageWithCategory(result.rows[0]);
  }

  async findById(id: string): Promise<MessageDetailWithCategory | null> {
    const result = await pool.query(
      'SELECT * FROM alumni_system.messages WHERE id = $1', 
      [id]
    );
    return result.rows[0] ? rowToMessageWithCategory(result.rows[0]) : null;
  }

  async updateStatus(
    id: string, 
    status: MessageStatus, 
    reviewedBy?: string,
    rejectionReason?: string
  ): Promise<MessageDetailWithCategory | null> {
    const result = await pool.query(
      `UPDATE alumni_system.messages 
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, rejection_reason = $3
       WHERE id = $4 RETURNING *`,
      [status, reviewedBy, status === 'rejected' ? rejectionReason : null, id]
    );
    return result.rows[0] ? rowToMessageWithCategory(result.rows[0]) : null;
  }

  async batchReview(request: BatchReviewRequest, reviewedBy?: string): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE alumni_system.messages 
         SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, 
             rejection_reason = $3
         WHERE id = ANY($4)`,
        [request.status, reviewedBy, request.status === 'rejected' ? request.rejectionReason : null, request.ids]
      );
      await client.query('COMMIT');
      return result.rowCount ?? 0;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.messages WHERE id = $1', 
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const messageRepository = new MessageRepository();

import { pool } from '../config/database';
import { ContentAuditLog, ListResponse } from '../types/models';

export interface AuditLogSearchCriteria {
  contentType?: string;
  contentId?: string;
  action?: string;
  operatorId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

function rowToAuditLog(row: any): ContentAuditLog {
  return {
    id: row.id,
    contentType: row.content_type,
    contentId: row.content_id,
    action: row.action,
    originalContent: row.original_content,
    newContent: row.new_content,
    operatorId: row.operator_id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export class ContentAuditRepository {
  async create(data: Omit<ContentAuditLog, 'id' | 'createdAt'>): Promise<ContentAuditLog> {
    const result = await pool.query(
      `INSERT INTO alumni_system.content_audit_logs 
       (content_type, content_id, action, original_content, new_content, operator_id, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.contentType,
        data.contentId,
        data.action,
        data.originalContent ? JSON.stringify(data.originalContent) : null,
        data.newContent ? JSON.stringify(data.newContent) : null,
        data.operatorId || null,
        data.reason || null,
      ]
    );
    return rowToAuditLog(result.rows[0]);
  }

  async findAll(criteria: AuditLogSearchCriteria): Promise<ListResponse<ContentAuditLog>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.contentType) {
      conditions.push(`content_type = $${paramIndex++}`);
      params.push(criteria.contentType);
    }
    if (criteria.contentId) {
      conditions.push(`content_id = $${paramIndex++}`);
      params.push(criteria.contentId);
    }
    if (criteria.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(criteria.action);
    }
    if (criteria.operatorId) {
      conditions.push(`operator_id = $${paramIndex++}`);
      params.push(criteria.operatorId);
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
      `SELECT COUNT(*) FROM alumni_system.content_audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.content_audit_logs WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToAuditLog), total };
  }

  async findByContentId(contentType: string, contentId: string): Promise<ContentAuditLog[]> {
    const result = await pool.query(
      `SELECT * FROM alumni_system.content_audit_logs 
       WHERE content_type = $1 AND content_id = $2
       ORDER BY created_at DESC`,
      [contentType, contentId]
    );
    return result.rows.map(rowToAuditLog);
  }
}

export const contentAuditRepository = new ContentAuditRepository();

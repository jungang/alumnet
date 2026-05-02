import { pool } from '../config/database';
import { AlumniAssociation, ListResponse } from '../types/models';

export interface AssociationSearchCriteria {
  city?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

function rowToAssociation(row: any): AlumniAssociation {
  return {
    id: row.id, city: row.city, region: row.region,
    contactName: row.contact_name, contactPhone: row.contact_phone,
    contactEmail: row.contact_email, wechatQrcode: row.wechat_qrcode,
    memberCount: row.member_count || 0, description: row.description,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export class AlumniAssociationRepository {
  async findAll(criteria: AssociationSearchCriteria): Promise<ListResponse<AlumniAssociation>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.city) { conditions.push(`city ILIKE $${paramIndex++}`); params.push(`%${criteria.city}%`); }
    if (criteria.keyword) {
      conditions.push(`(city ILIKE $${paramIndex} OR contact_name ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`); paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await pool.query(`SELECT COUNT(*) FROM alumni_system.alumni_associations WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.alumni_associations WHERE ${whereClause}
       ORDER BY city ASC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );
    return { items: dataResult.rows.map(rowToAssociation), total };
  }

  async findById(id: string): Promise<AlumniAssociation | null> {
    const result = await pool.query('SELECT * FROM alumni_system.alumni_associations WHERE id = $1', [id]);
    return result.rows[0] ? rowToAssociation(result.rows[0]) : null;
  }

  async create(data: Partial<AlumniAssociation>): Promise<AlumniAssociation> {
    const result = await pool.query(
      `INSERT INTO alumni_system.alumni_associations (city, region, contact_name, contact_phone, contact_email, wechat_qrcode, member_count, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.city, data.region, data.contactName, data.contactPhone, data.contactEmail, data.wechatQrcode, data.memberCount || 0, data.description]
    );
    return rowToAssociation(result.rows[0]);
  }

  async update(id: string, data: Partial<AlumniAssociation>): Promise<AlumniAssociation | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.city !== undefined) { fields.push(`city = $${paramIndex++}`); params.push(data.city); }
    if (data.region !== undefined) { fields.push(`region = $${paramIndex++}`); params.push(data.region); }
    if (data.contactName !== undefined) { fields.push(`contact_name = $${paramIndex++}`); params.push(data.contactName); }
    if (data.contactPhone !== undefined) { fields.push(`contact_phone = $${paramIndex++}`); params.push(data.contactPhone); }
    if (data.contactEmail !== undefined) { fields.push(`contact_email = $${paramIndex++}`); params.push(data.contactEmail); }
    if (data.wechatQrcode !== undefined) { fields.push(`wechat_qrcode = $${paramIndex++}`); params.push(data.wechatQrcode); }
    if (data.memberCount !== undefined) { fields.push(`member_count = $${paramIndex++}`); params.push(data.memberCount); }
    if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); params.push(data.description); }

    if (fields.length === 0) return this.findById(id);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const result = await pool.query(`UPDATE alumni_system.alumni_associations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, params);
    return result.rows[0] ? rowToAssociation(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM alumni_system.alumni_associations WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const alumniAssociationRepository = new AlumniAssociationRepository();

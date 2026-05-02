import { pool } from '../config/database';
import { DonationProject, DonationProjectStatus, ListResponse } from '../types/models';

export interface DonationProjectSearchCriteria {
  status?: DonationProjectStatus;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

function rowToProject(row: any): DonationProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetAmount: parseFloat(row.target_amount),
    currentAmount: parseFloat(row.current_amount || 0),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class DonationProjectRepository {
  async findAll(criteria: DonationProjectSearchCriteria): Promise<ListResponse<DonationProject>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(criteria.status);
    }
    if (criteria.keyword) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.donation_projects WHERE ${whereClause}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    const limitParam = paramIndex++;
    const offsetParam = paramIndex;
    const dataResult = await pool.query(
      `SELECT * FROM alumni_system.donation_projects WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return { items: dataResult.rows.map(rowToProject), total };
  }

  async findById(id: string): Promise<DonationProject | null> {
    const result = await pool.query('SELECT * FROM alumni_system.donation_projects WHERE id = $1', [id]);
    return result.rows[0] ? rowToProject(result.rows[0]) : null;
  }

  async create(data: { name: string; description?: string; targetAmount: number }): Promise<DonationProject> {
    const result = await pool.query(
      `INSERT INTO alumni_system.donation_projects (name, description, target_amount)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.description || null, data.targetAmount]
    );
    return rowToProject(result.rows[0]);
  }

  async update(id: string, data: Partial<{ name: string; description: string; targetAmount: number; status: DonationProjectStatus }>): Promise<DonationProject | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) { fields.push(`name = $${paramIndex++}`); params.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${paramIndex++}`); params.push(data.description); }
    if (data.targetAmount !== undefined) { fields.push(`target_amount = $${paramIndex++}`); params.push(data.targetAmount); }
    if (data.status !== undefined) { fields.push(`status = $${paramIndex++}`); params.push(data.status); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    const result = await pool.query(
      `UPDATE alumni_system.donation_projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0] ? rowToProject(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM alumni_system.donation_projects WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getDonationRecords(projectId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM alumni_system.donations WHERE project_id = $1 ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows;
  }

  async updateCurrentAmount(projectId: string): Promise<void> {
    await pool.query(
      `UPDATE alumni_system.donation_projects 
       SET current_amount = (SELECT COALESCE(SUM(amount), 0) FROM alumni_system.donations WHERE project_id = $1)
       WHERE id = $1`,
      [projectId]
    );
  }
}

export const donationProjectRepository = new DonationProjectRepository();

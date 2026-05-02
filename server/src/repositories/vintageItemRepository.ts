import { pool } from '../config/database';
import { VintageItem, VintageItemType, ListResponse } from '../types/models';

export interface VintageItemSearchCriteria {
  itemType?: VintageItemType;
  era?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

// 数据库行转换为VintageItem对象
function rowToVintageItem(row: any): VintageItem {
  return {
    id: row.id,
    name: row.name,
    itemType: row.item_type,
    era: row.era,
    description: row.description,
    images: row.images || [],
    sortOrder: row.sort_order,
    donorName: row.donor_name,
    donorClass: row.donor_class,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class VintageItemRepository {
  // 获取老物件列表
  async findAll(criteria: VintageItemSearchCriteria): Promise<ListResponse<VintageItem>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.itemType) {
      conditions.push(`item_type = $${paramIndex++}`);
      params.push(criteria.itemType);
    }

    if (criteria.era) {
      conditions.push(`era = $${paramIndex++}`);
      params.push(criteria.era);
    }

    if (criteria.keyword) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.vintage_items WHERE ${whereClause}`,
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
      `SELECT * FROM alumni_system.vintage_items 
       WHERE ${whereClause}
       ORDER BY sort_order ASC, created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return {
      items: dataResult.rows.map(rowToVintageItem),
      total,
    };
  }

  // 根据ID查询
  async findById(id: string): Promise<VintageItem | null> {
    const result = await pool.query(
      'SELECT * FROM alumni_system.vintage_items WHERE id = $1',
      [id]
    );
    return result.rows[0] ? rowToVintageItem(result.rows[0]) : null;
  }

  // 创建老物件
  async create(data: {
    name: string;
    itemType: VintageItemType;
    era?: string;
    description?: string;
    images?: string[];
    sortOrder?: number;
    donorName?: string;
    donorClass?: string;
  }): Promise<VintageItem> {
    const result = await pool.query(
      `INSERT INTO alumni_system.vintage_items 
       (name, item_type, era, description, images, sort_order, donor_name, donor_class)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.name,
        data.itemType,
        data.era || null,
        data.description || null,
        JSON.stringify(data.images || []),
        data.sortOrder || 0,
        data.donorName || null,
        data.donorClass || null,
      ]
    );
    return rowToVintageItem(result.rows[0]);
  }

  // 更新老物件
  async update(id: string, data: {
    name?: string;
    itemType?: VintageItemType;
    era?: string;
    description?: string;
    images?: string[];
    sortOrder?: number;
    donorName?: string;
    donorClass?: string;
  }): Promise<VintageItem | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.itemType !== undefined) {
      fields.push(`item_type = $${paramIndex++}`);
      params.push(data.itemType);
    }
    if (data.era !== undefined) {
      fields.push(`era = $${paramIndex++}`);
      params.push(data.era);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }
    if (data.images !== undefined) {
      fields.push(`images = $${paramIndex++}`);
      params.push(JSON.stringify(data.images));
    }
    if (data.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramIndex++}`);
      params.push(data.sortOrder);
    }
    if (data.donorName !== undefined) {
      fields.push(`donor_name = $${paramIndex++}`);
      params.push(data.donorName);
    }
    if (data.donorClass !== undefined) {
      fields.push(`donor_class = $${paramIndex++}`);
      params.push(data.donorClass);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE alumni_system.vintage_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0] ? rowToVintageItem(result.rows[0]) : null;
  }

  // 删除老物件
  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.vintage_items WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // 获取所有类型
  async getTypes(): Promise<VintageItemType[]> {
    const result = await pool.query(
      'SELECT DISTINCT item_type FROM alumni_system.vintage_items ORDER BY item_type'
    );
    return result.rows.map(row => row.item_type);
  }

  // 获取所有年代
  async getEras(): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT era FROM alumni_system.vintage_items WHERE era IS NOT NULL ORDER BY era'
    );
    return result.rows.map(row => row.era);
  }

  // 获取统计信息
  async getStats(): Promise<{ type: VintageItemType; count: number }[]> {
    const result = await pool.query(
      `SELECT item_type as type, COUNT(*) as count 
       FROM alumni_system.vintage_items 
       GROUP BY item_type 
       ORDER BY count DESC`
    );
    return result.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count),
    }));
  }
}

export const vintageItemRepository = new VintageItemRepository();

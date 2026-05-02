import { pool } from '../config/database';
import { Alumni } from '../types/models';

export interface SearchCriteria {
  keyword?: string;
  yearStart?: number;
  yearEnd?: number;
  industry?: string;
  className?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 数据库行转换为Alumni对象
function rowToAlumni(row: any): Alumni {
  return {
    id: row.id,
    name: row.name,
    studentId: row.student_id,
    graduationYear: row.graduation_year,
    className: row.class_name,
    industry: row.industry,
    currentCity: row.current_city,
    workUnit: row.work_unit,
    phone: row.phone,
    email: row.email,
    phoneVisibility: row.phone_visibility,
    emailVisibility: row.email_visibility,
    status: row.status,
    biography: row.biography,
    photoUrl: row.photo_url ? `${row.photo_url}?t=${new Date(row.updated_at || row.created_at).getTime()}` : row.photo_url,
    extraInfo: row.extra_info,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AlumniRepository {
  // 根据ID查询校友（合并杰出校友数据）
  async findById(id: string): Promise<Alumni | null> {
    const result = await pool.query('SELECT * FROM alumni_system.alumni WHERE id = $1', [id]);
    if (!result.rows[0]) return null;
    
    const alumni = rowToAlumni(result.rows[0]);
    
    // 查询杰出校友数据
    const distinguishedResult = await pool.query(
      'SELECT category, achievement, video_url, popularity, timeline FROM alumni_system.distinguished_alumni WHERE alumni_id = $1',
      [id]
    );
    
    // 合并杰出校友数据到 extraInfo
    if (distinguishedResult.rows.length > 0) {
      const distinguished = distinguishedResult.rows[0];
      alumni.extraInfo = {
        ...alumni.extraInfo,
        achievement: distinguished.achievement,
        category: distinguished.category,
        videoUrl: distinguished.video_url,
        popularity: distinguished.popularity,
        timeline: distinguished.timeline,
      };
    }
    
    return alumni;
  }

  // 根据学号和姓名查询校友（用于身份验证）
  async findByStudentIdAndName(studentId: string, name: string): Promise<Alumni | null> {
    const result = await pool.query(
      'SELECT * FROM alumni_system.alumni WHERE student_id = $1 AND name = $2',
      [studentId, name]
    );
    return result.rows[0] ? rowToAlumni(result.rows[0]) : null;
  }

  // 多条件搜索 - 优先显示有照片的杰出校友
  async search(criteria: SearchCriteria): Promise<PagedResult<Alumni>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.keyword) {
      conditions.push(`(a.name ILIKE $${paramIndex} OR a.student_id ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    if (criteria.yearStart !== undefined && criteria.yearEnd !== undefined) {
      conditions.push(`a.graduation_year BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(criteria.yearStart, criteria.yearEnd);
      paramIndex += 2;
    } else if (criteria.yearStart !== undefined) {
      conditions.push(`a.graduation_year >= $${paramIndex}`);
      params.push(criteria.yearStart);
      paramIndex++;
    } else if (criteria.yearEnd !== undefined) {
      conditions.push(`a.graduation_year <= $${paramIndex}`);
      params.push(criteria.yearEnd);
      paramIndex++;
    }

    if (criteria.industry) {
      conditions.push(`a.industry = $${paramIndex}`);
      params.push(criteria.industry);
      paramIndex++;
    }

    if (criteria.className) {
      conditions.push(`a.class_name = $${paramIndex}`);
      params.push(criteria.className);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.alumni a WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // 分页参数
    const page = criteria.page || 1;
    const pageSize = criteria.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // 查询数据 - 优先显示有照片的杰出校友
    // 排序规则: 1. 有照片的杰出校友 2. 有照片的普通校友 3. 无照片的杰出校友 4. 无照片的普通校友
    const dataResult = await pool.query(
      `SELECT a.*, d.category as distinguished_category, d.achievement as distinguished_achievement
       FROM alumni_system.alumni a
       LEFT JOIN alumni_system.distinguished_alumni d ON a.id = d.alumni_id
       WHERE ${whereClause}
       ORDER BY 
         CASE WHEN a.photo_url IS NOT NULL AND d.alumni_id IS NOT NULL THEN 0
              WHEN a.photo_url IS NOT NULL THEN 1
              WHEN d.alumni_id IS NOT NULL THEN 2
              ELSE 3 END,
         a.graduation_year DESC, 
         a.name ASC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageSize, offset]
    );

    // 转换结果，合并杰出校友信息
    const items = dataResult.rows.map(row => {
      const alumni = rowToAlumni(row);
      if (row.distinguished_category) {
        alumni.extraInfo = {
          ...alumni.extraInfo,
          category: row.distinguished_category,
          achievement: row.distinguished_achievement,
        };
      }
      return alumni;
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  // 获取同班同学
  async getClassmates(alumniId: string): Promise<Alumni[]> {
    const result = await pool.query(
      `SELECT * FROM alumni_system.alumni 
       WHERE class_name = (SELECT class_name FROM alumni_system.alumni WHERE id = $1)
         AND id != $1
       ORDER BY name`,
      [alumniId]
    );
    return result.rows.map(rowToAlumni);
  }

  // 获取推荐校友（同届或同行业）
  async getRecommendations(alumniId: string, limit: number = 5): Promise<Alumni[]> {
    const result = await pool.query(
      `SELECT * FROM alumni_system.alumni 
       WHERE id != $1 
         AND (graduation_year = (SELECT graduation_year FROM alumni_system.alumni WHERE id = $1)
              OR industry = (SELECT industry FROM alumni_system.alumni WHERE id = $1))
       ORDER BY RANDOM()
       LIMIT $2`,
      [alumniId, limit]
    );
    return result.rows.map(rowToAlumni);
  }

  // 混合查询：结构化过滤 + 语义相似度
  async hybridSearch(criteria: SearchCriteria, queryVector: number[]): Promise<Alumni[]> {
    const conditions: string[] = ['biography_embedding IS NOT NULL'];
    const params: any[] = [JSON.stringify(queryVector)];
    let paramIndex = 2;

    if (criteria.yearStart !== undefined && criteria.yearEnd !== undefined) {
      conditions.push(`graduation_year BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(criteria.yearStart, criteria.yearEnd);
      paramIndex += 2;
    }

    if (criteria.industry) {
      conditions.push(`industry = $${paramIndex}`);
      params.push(criteria.industry);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT *, 1 - (biography_embedding <=> $1::vector) as similarity
       FROM alumni_system.alumni 
       WHERE ${conditions.join(' AND ')}
       ORDER BY biography_embedding <=> $1::vector
       LIMIT 10`,
      params
    );

    return result.rows.map(rowToAlumni);
  }

  // 创建校友
  async create(alumni: Partial<Alumni>): Promise<Alumni> {
    const result = await pool.query(
      `INSERT INTO alumni_system.alumni (name, student_id, graduation_year, class_name, 
        industry, current_city, work_unit, phone, email, phone_visibility, email_visibility, 
        status, extra_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        alumni.name,
        alumni.studentId,
        alumni.graduationYear,
        alumni.className,
        alumni.industry,
        alumni.currentCity,
        alumni.workUnit,
        alumni.phone,
        alumni.email,
        alumni.phoneVisibility || 'classmates_only',
        alumni.emailVisibility || 'classmates_only',
        alumni.status || 'active',
        JSON.stringify(alumni.extraInfo || {}),
      ]
    );
    return rowToAlumni(result.rows[0]);
  }

  // 更新校友
  async update(id: string, alumni: Partial<Alumni>): Promise<Alumni | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (alumni.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(alumni.name);
    }
    if (alumni.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      params.push(alumni.phone);
    }
    if (alumni.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      params.push(alumni.email);
    }
    if (alumni.industry !== undefined) {
      fields.push(`industry = $${paramIndex++}`);
      params.push(alumni.industry);
    }
    if (alumni.currentCity !== undefined) {
      fields.push(`current_city = $${paramIndex++}`);
      params.push(alumni.currentCity);
    }
    if (alumni.workUnit !== undefined) {
      fields.push(`work_unit = $${paramIndex++}`);
      params.push(alumni.workUnit);
    }
    if (alumni.phoneVisibility !== undefined) {
      fields.push(`phone_visibility = $${paramIndex++}`);
      params.push(alumni.phoneVisibility);
    }
    if (alumni.emailVisibility !== undefined) {
      fields.push(`email_visibility = $${paramIndex++}`);
      params.push(alumni.emailVisibility);
    }
    if (alumni.extraInfo !== undefined) {
      fields.push(`extra_info = $${paramIndex++}`);
      params.push(JSON.stringify(alumni.extraInfo));
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE alumni_system.alumni SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0] ? rowToAlumni(result.rows[0]) : null;
  }

  // 删除校友
  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM alumni_system.alumni WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // 获取所有行业列表
  async getIndustries(): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT industry FROM alumni_system.alumni WHERE industry IS NOT NULL ORDER BY industry'
    );
    return result.rows.map(row => row.industry);
  }

  // 获取所有班级列表
  async getClasses(): Promise<string[]> {
    const result = await pool.query(
      'SELECT DISTINCT class_name FROM alumni_system.alumni WHERE class_name IS NOT NULL ORDER BY class_name'
    );
    return result.rows.map(row => row.class_name);
  }

  // 获取年份范围
  async getYearRange(): Promise<{ min: number; max: number }> {
    const result = await pool.query(
      'SELECT MIN(graduation_year) as min, MAX(graduation_year) as max FROM alumni_system.alumni'
    );
    return {
      min: result.rows[0].min || 1950,
      max: result.rows[0].max || new Date().getFullYear(),
    };
  }
}

export const alumniRepository = new AlumniRepository();

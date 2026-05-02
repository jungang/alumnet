import { pool } from '../config/database';
import { ClassRoster, ClassRosterDetail, ClassStudent, GraduationPhoto, ListResponse, ImportResult } from '../types/models';

export interface ClassRosterSearchCriteria {
  graduationYear?: number;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

// 数据库行转换为ClassRoster对象
function rowToClassRoster(row: any): ClassRoster {
  return {
    id: row.id,
    className: row.class_name,
    graduationYear: row.graduation_year,
    headTeacher: row.head_teacher,
    studentCount: row.student_count,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// 数据库行转换为ClassStudent对象
function rowToClassStudent(row: any): ClassStudent {
  return {
    id: row.id,
    classId: row.class_id,
    studentName: row.student_name,
    studentId: row.student_id,
    alumniId: row.alumni_id,
    seatNumber: row.seat_number,
    createdAt: row.created_at,
  };
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

export class ClassRosterRepository {
  // 获取班级名录列表
  async findAll(criteria: ClassRosterSearchCriteria): Promise<ListResponse<ClassRoster>> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.graduationYear) {
      conditions.push(`graduation_year = $${paramIndex++}`);
      params.push(criteria.graduationYear);
    }

    if (criteria.keyword) {
      conditions.push(`(class_name ILIKE $${paramIndex} OR head_teacher ILIKE $${paramIndex})`);
      params.push(`%${criteria.keyword}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // 查询总数
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM alumni_system.class_rosters WHERE ${whereClause}`,
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
      `SELECT * FROM alumni_system.class_rosters 
       WHERE ${whereClause}
       ORDER BY graduation_year DESC, class_name ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, pageSize, offset]
    );

    return {
      items: dataResult.rows.map(rowToClassRoster),
      total,
    };
  }

  // 根据ID查询（包含学生和照片）
  async findById(id: string): Promise<ClassRosterDetail | null> {
    const rosterResult = await pool.query(
      'SELECT * FROM alumni_system.class_rosters WHERE id = $1',
      [id]
    );
    
    if (!rosterResult.rows[0]) return null;

    const roster = rowToClassRoster(rosterResult.rows[0]);

    // 获取学生列表
    const studentsResult = await pool.query(
      'SELECT * FROM alumni_system.class_students WHERE class_id = $1 ORDER BY seat_number, student_name',
      [id]
    );

    // 获取关联的毕业照
    const photosResult = await pool.query(
      `SELECT gp.* FROM alumni_system.graduation_photos gp
       INNER JOIN alumni_system.class_photo_links cpl ON gp.id = cpl.photo_id
       WHERE cpl.class_id = $1
       ORDER BY gp.year DESC`,
      [id]
    );

    return {
      ...roster,
      students: studentsResult.rows.map(rowToClassStudent),
      photos: photosResult.rows.map(rowToPhoto),
    };
  }

  // 创建班级名录
  async create(data: {
    className: string;
    graduationYear: number;
    headTeacher?: string;
    studentCount?: number;
    description?: string;
  }): Promise<ClassRoster> {
    const result = await pool.query(
      `INSERT INTO alumni_system.class_rosters 
       (class_name, graduation_year, head_teacher, student_count, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.className,
        data.graduationYear,
        data.headTeacher || null,
        data.studentCount || 0,
        data.description || null,
      ]
    );
    return rowToClassRoster(result.rows[0]);
  }

  // 更新班级名录
  async update(id: string, data: {
    className?: string;
    graduationYear?: number;
    headTeacher?: string;
    studentCount?: number;
    description?: string;
  }): Promise<ClassRoster | null> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.className !== undefined) {
      fields.push(`class_name = $${paramIndex++}`);
      params.push(data.className);
    }
    if (data.graduationYear !== undefined) {
      fields.push(`graduation_year = $${paramIndex++}`);
      params.push(data.graduationYear);
    }
    if (data.headTeacher !== undefined) {
      fields.push(`head_teacher = $${paramIndex++}`);
      params.push(data.headTeacher);
    }
    if (data.studentCount !== undefined) {
      fields.push(`student_count = $${paramIndex++}`);
      params.push(data.studentCount);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (fields.length === 0) {
      const result = await pool.query('SELECT * FROM alumni_system.class_rosters WHERE id = $1', [id]);
      return result.rows[0] ? rowToClassRoster(result.rows[0]) : null;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await pool.query(
      `UPDATE alumni_system.class_rosters SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    return result.rows[0] ? rowToClassRoster(result.rows[0]) : null;
  }

  // 删除班级名录
  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.class_rosters WHERE id = $1',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // 关联毕业照
  async linkPhoto(classId: string, photoId: string): Promise<boolean> {
    try {
      await pool.query(
        `INSERT INTO alumni_system.class_photo_links (class_id, photo_id)
         VALUES ($1, $2)
         ON CONFLICT (class_id, photo_id) DO NOTHING`,
        [classId, photoId]
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  // 取消关联毕业照
  async unlinkPhoto(classId: string, photoId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM alumni_system.class_photo_links WHERE class_id = $1 AND photo_id = $2',
      [classId, photoId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // 添加学生
  async addStudent(data: {
    classId: string;
    studentName: string;
    studentId?: string;
    alumniId?: string;
    seatNumber?: number;
  }): Promise<ClassStudent> {
    const result = await pool.query(
      `INSERT INTO alumni_system.class_students 
       (class_id, student_name, student_id, alumni_id, seat_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.classId, data.studentName, data.studentId || null, data.alumniId || null, data.seatNumber || null]
    );
    
    // 更新学生人数
    await this.updateStudentCount(data.classId);
    
    return rowToClassStudent(result.rows[0]);
  }

  // 更新学生信息
  async updateStudent(studentId: string, data: { studentName?: string; studentId?: string; seatNumber?: number; alumniId?: string }): Promise<ClassStudent | null> {
    // 先获取学生信息
    const studentResult = await pool.query(
      'SELECT class_id FROM alumni_system.class_students WHERE id = $1',
      [studentId]
    );
    
    if (!studentResult.rows[0]) return null;
    
    // 构建更新语句
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;
    
    if (data.studentName !== undefined) {
      updates.push(`student_name = $${idx}`);
      values.push(data.studentName);
      idx++;
    }
    if (data.studentId !== undefined) {
      updates.push(`student_id = $${idx}`);
      values.push(data.studentId || null);
      idx++;
    }
    if (data.seatNumber !== undefined) {
      updates.push(`seat_number = $${idx}`);
      values.push(data.seatNumber || null);
      idx++;
    }
    if (data.alumniId !== undefined) {
      updates.push(`alumni_id = $${idx}`);
      values.push(data.alumniId || null);
      idx++;
    }
    
    if (updates.length === 0) return null;
    
    // 添加WHERE条件参数
    values.push(studentId);
    
    const sql = `UPDATE alumni_system.class_students SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(sql, values);
    
    return result.rows[0] ? rowToClassStudent(result.rows[0]) : null;
  }

  // 删除学生
  async removeStudent(studentId: string): Promise<boolean> {
    const studentResult = await pool.query(
      'SELECT class_id FROM alumni_system.class_students WHERE id = $1',
      [studentId]
    );
    
    if (!studentResult.rows[0]) return false;
    
    const classId = studentResult.rows[0].class_id;
    
    const result = await pool.query(
      'DELETE FROM alumni_system.class_students WHERE id = $1',
      [studentId]
    );
    
    if ((result.rowCount ?? 0) > 0) {
      await this.updateStudentCount(classId);
      return true;
    }
    return false;
  }

  // 批量导入学生
  async importStudents(classId: string, students: { studentName: string; studentId?: string; seatNumber?: number }[]): Promise<ImportResult> {
    const result: ImportResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      try {
        if (!student.studentName || !student.studentName.trim()) {
          result.failed++;
          result.errors.push({ row: i + 1, reason: '学生姓名不能为空' });
          continue;
        }

        await pool.query(
          `INSERT INTO alumni_system.class_students (class_id, student_name, student_id, seat_number)
           VALUES ($1, $2, $3, $4)`,
          [classId, student.studentName.trim(), student.studentId || null, student.seatNumber || null]
        );
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({ row: i + 1, reason: '导入失败' });
      }
    }

    // 更新学生人数
    await this.updateStudentCount(classId);

    return result;
  }

  // 更新学生人数
  private async updateStudentCount(classId: string): Promise<void> {
    await pool.query(
      `UPDATE alumni_system.class_rosters 
       SET student_count = (SELECT COUNT(*) FROM alumni_system.class_students WHERE class_id = $1)
       WHERE id = $1`,
      [classId]
    );
  }

  // 获取所有年份
  async getYears(): Promise<number[]> {
    const result = await pool.query(
      'SELECT DISTINCT graduation_year FROM alumni_system.class_rosters ORDER BY graduation_year DESC'
    );
    return result.rows.map(row => row.graduation_year);
  }
}

export const classRosterRepository = new ClassRosterRepository();

/**
 * 数据导入服务 — 支持 CSV/JSON + 增量更新（基于学号匹配）
 */
import { pool } from '../config/database';
import logger from '../config/logger';

interface ImportRow {
  [key: string]: any;
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; data: ImportRow; error: string }>;
}

// 字段映射：CSV 中文表头 → 数据库字段
const FIELD_MAP: Record<string, string> = {
  '姓名': 'name',
  '学号': 'student_id',
  '毕业年份': 'graduation_year',
  '班级': 'class_name',
  '行业': 'industry',
  '简介': 'biography',
  '成就': 'achievement',
  '职务': 'title',
  '联系方式': 'contact_info',
  '邮箱': 'email',
  '电话': 'phone',
  '类别': 'category',
  '备注': 'extra_info',
  // English aliases
  'name': 'name',
  'student_id': 'student_id',
  'studentId': 'student_id',
  'graduation_year': 'graduation_year',
  'graduationYear': 'graduation_year',
  'class_name': 'class_name',
  'className': 'class_name',
  'industry': 'industry',
  'biography': 'biography',
  'achievement': 'achievement',
  'title': 'title',
  'contact_info': 'contact_info',
  'email': 'email',
  'phone': 'phone',
  'category': 'category',
  'extra_info': 'extra_info',
};

class ImportService {
  /**
   * 解析 CSV 文本为行数组
   */
  parseCSV(csvText: string): ImportRow[] {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    // 检测分隔符（逗号或制表符）
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    const headers = this.parseCSVLine(lines[0], delimiter);
    const rows: ImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);
      if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

      const row: ImportRow = {};
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j].trim();
        const fieldName = FIELD_MAP[header] || header;
        row[fieldName] = values[j]?.trim() || null;
      }
      rows.push(row);
    }

    return rows;
  }

  /**
   * 解析单行 CSV（处理引号内的逗号）
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // 跳过转义引号
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * 解析 JSON 文本（支持数组和对象）
   */
  parseJSON(jsonText: string): ImportRow[] {
    const data = JSON.parse(jsonText);
    if (Array.isArray(data)) return data;
    if (data.alumni && Array.isArray(data.alumni)) return data.alumni;
    if (data.data && Array.isArray(data.data)) return data.data;
    throw new Error('JSON 格式不支持：需要数组或包含 alumni/data 字段的对象');
  }

  /**
   * 导入数据（增量更新模式）
   * - 有 student_id 且已存在 → 更新
   * - 有 student_id 但不存在 → 创建
   * - 无 student_id → 创建
   */
  async importData(rows: ImportRow[], classId?: string): Promise<ImportResult> {
    const result: ImportResult = {
      total: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (rows.length > 500) {
      throw new Error('单次导入不能超过 500 条');
    }

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = this.normalizeRow(rows[i]);
        if (classId) row.class_id = classId;

        // 必须有姓名
        if (!row.name) {
          result.skipped++;
          continue;
        }

        if (row.student_id) {
          // 增量更新：按学号匹配
          const existing = await this.findByStudentId(row.student_id);
          if (existing) {
            await this.updateAlumni(existing.id, row);
            result.updated++;
          } else {
            await this.createAlumni(row);
            result.created++;
          }
        } else {
          // 无学号，按姓名+班级去重
          const existing = await this.findByNameAndClass(row.name, row.class_name);
          if (existing) {
            await this.updateAlumni(existing.id, row);
            result.updated++;
          } else {
            await this.createAlumni(row);
            result.created++;
          }
        }
      } catch (error: any) {
        result.errors.push({ row: i + 1, data: rows[i], error: error.message });
      }
    }

    logger.info({
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length,
    }, '数据导入完成');

    return result;
  }

  /** 标准化行数据 */
  private normalizeRow(row: ImportRow): ImportRow {
    const normalized: ImportRow = {};
    for (const [key, value] of Object.entries(row)) {
      const fieldName = FIELD_MAP[key] || key;
      // 类型转换
      if (fieldName === 'graduation_year' && typeof value === 'string') {
        const year = parseInt(value);
        if (!isNaN(year)) normalized[fieldName] = year;
      } else {
        normalized[fieldName] = value;
      }
    }
    return normalized;
  }

  private async findByStudentId(studentId: string) {
    const result = await pool.query(
      'SELECT id FROM alumni_system.alumni WHERE student_id = $1',
      [studentId]
    );
    return result.rows[0] || null;
  }

  private async findByNameAndClass(name: string, className?: string | null) {
    const query = className
      ? 'SELECT id FROM alumni_system.alumni WHERE name = $1 AND class_name = $2'
      : 'SELECT id FROM alumni_system.alumni WHERE name = $1';
    const params = className ? [name, className] : [name];
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  private async createAlumni(data: ImportRow) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = fields.join(', ');

    await pool.query(
      `INSERT INTO alumni_system.alumni (${columnNames}) VALUES (${placeholders})`,
      values
    );
  }

  private async updateAlumni(id: string, data: ImportRow) {
    const fields = Object.keys(data).filter(f => f !== 'student_id'); // 不更新学号
    if (fields.length === 0) return;

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = fields.map(f => data[f]);

    await pool.query(
      `UPDATE alumni_system.alumni SET ${setClauses} WHERE id = $${fields.length + 1}`,
      [...values, id]
    );
  }
}

export const importService = new ImportService();

/**
 * 统一筛选和搜索工具函数
 */

export interface FilterOptions {
  keyword?: string;
  year?: number;
  className?: string;
  itemType?: string;
  era?: string;
  graduationYear?: number;
}

/**
 * 构建SQL WHERE条件
 * @param filters 筛选条件
 * @param tableAlias 表别名
 * @returns { conditions: string[], params: any[], paramIndex: number }
 */
export function buildWhereConditions(
  filters: FilterOptions,
  tableAlias: string = ''
): { conditions: string[]; params: any[]; paramIndex: number } {
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIndex = 1;
  const prefix = tableAlias ? `${tableAlias}.` : '';

  if (filters.keyword) {
    // 关键词搜索 - 根据不同表有不同的搜索字段
    conditions.push(`(
      ${prefix}name ILIKE $${paramIndex} OR 
      COALESCE(${prefix}description, '') ILIKE $${paramIndex}
    )`);
    params.push(`%${filters.keyword}%`);
    paramIndex++;
  }

  if (filters.year !== undefined) {
    conditions.push(`${prefix}year = $${paramIndex}`);
    params.push(filters.year);
    paramIndex++;
  }

  if (filters.className) {
    conditions.push(`${prefix}class_name ILIKE $${paramIndex}`);
    params.push(`%${filters.className}%`);
    paramIndex++;
  }

  if (filters.itemType) {
    conditions.push(`${prefix}item_type = $${paramIndex}`);
    params.push(filters.itemType);
    paramIndex++;
  }

  if (filters.era) {
    conditions.push(`${prefix}era = $${paramIndex}`);
    params.push(filters.era);
    paramIndex++;
  }

  if (filters.graduationYear !== undefined) {
    conditions.push(`${prefix}graduation_year = $${paramIndex}`);
    params.push(filters.graduationYear);
    paramIndex++;
  }

  return { conditions, params, paramIndex };
}

/**
 * 构建分页参数
 * @param page 页码
 * @param pageSize 每页数量
 * @returns { limit: number, offset: number }
 */
export function buildPagination(page: number = 1, pageSize: number = 20): { limit: number; offset: number } {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  return {
    limit: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };
}

/**
 * 验证筛选结果是否匹配条件
 * @param item 数据项
 * @param filters 筛选条件
 * @returns 是否匹配
 */
export function validateFilterMatch(item: any, filters: FilterOptions): boolean {
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    const name = (item.name || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    if (!name.includes(keyword) && !description.includes(keyword)) {
      return false;
    }
  }

  if (filters.year !== undefined && item.year !== filters.year) {
    return false;
  }

  if (filters.className) {
    const className = (item.className || item.class_name || '').toLowerCase();
    if (!className.includes(filters.className.toLowerCase())) {
      return false;
    }
  }

  if (filters.itemType && item.itemType !== filters.itemType && item.item_type !== filters.itemType) {
    return false;
  }

  if (filters.era && item.era !== filters.era) {
    return false;
  }

  if (filters.graduationYear !== undefined) {
    const gradYear = item.graduationYear || item.graduation_year;
    if (gradYear !== filters.graduationYear) {
      return false;
    }
  }

  return true;
}

/**
 * 高亮搜索关键词
 * @param text 原文本
 * @param keyword 关键词
 * @returns 高亮后的HTML
 */
export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword || !text) return text;
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

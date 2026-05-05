/**
 * 通用验证工具
 */

// UUID 验证正则
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 验证是否为有效 UUID */
export function isValidUUID(value: string | undefined): value is string {
  return !!value && UUID_REGEX.test(value);
}

/** 验证分页参数，返回安全的 page 和 pageSize */
export function validatePagination(page?: string, pageSize?: string, maxPageSize: number = 100) {
  return {
    page: Math.max(1, parseInt(page || '1')),
    pageSize: Math.min(maxPageSize, Math.max(1, parseInt(pageSize || '20'))),
  };
}

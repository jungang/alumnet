/**
 * 操作日志记录工具
 * 从 admin.ts 提取，供所有管理路由共用
 */

import { pool } from '../config/database';

// UUID 验证正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 安全记录操作日志（跳过无效 UUID）
 */
export async function logOperation(
  userId: string | undefined,
  operationType: string,
  targetType: string,
  targetId: string | undefined,
  details: any
): Promise<void> {
  try {
    const validUserId = userId && UUID_REGEX.test(userId) ? userId : null;
    const validTargetId = targetId && UUID_REGEX.test(targetId) ? targetId : null;
    
    await pool.query(
      `INSERT INTO alumni_system.operation_logs (user_id, operation_type, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [validUserId, operationType, targetType, validTargetId, JSON.stringify(details)]
    );
  } catch (error) {
    console.warn('记录操作日志失败:', error);
  }
}

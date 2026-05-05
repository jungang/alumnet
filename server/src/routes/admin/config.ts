/**
 * Admin 子路由 — 系统配置管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pool } from '../../config/database';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler } from '../../middleware/errorHandler';
import { validate, updateConfigSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/config', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM alumni_system.system_config ORDER BY config_key');
  res.json({ success: true, data: result.rows });
}));

router.put('/config', validate(updateConfigSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = req.body;
  for (const [key, value] of Object.entries(configs)) {
    await pool.query(
      'UPDATE alumni_system.system_config SET config_value = $1, updated_at = CURRENT_TIMESTAMP WHERE config_key = $2',
      [value, key]
    );
  }
  await logOperation(req.userSession?.userId, 'update', 'system_config', undefined, configs);
  res.json({ success: true, message: '配置更新成功' });
}));

export default router;

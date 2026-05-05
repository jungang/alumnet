/**
 * Admin 子路由 — 操作日志
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pool } from '../../config/database';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = Router();

router.get('/logs', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20, operationType, startDate, endDate } = req.query;
  
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIndex = 1;

  if (operationType) {
    conditions.push(`operation_type = $${paramIndex++}`);
    params.push(operationType);
  }
  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(startDate);
  }
  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(endDate);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM alumni_system.operation_logs WHERE ${conditions.join(' AND ')}`,
    params
  );

  const offset = (Number(page) - 1) * Number(pageSize);
  params.push(Number(pageSize), offset);
  const limitParam = paramIndex++;
  const offsetParam = paramIndex;

  const result = await pool.query(
    `SELECT * FROM alumni_system.operation_logs 
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params
  );

  res.json({
    success: true,
    data: {
      items: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
}));

export default router;

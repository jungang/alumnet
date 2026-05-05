/**
 * Admin 子路由 — 统计数据
 * 合并了两处重复的 stats 路由
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pool } from '../../config/database';
import { asyncHandler } from '../../middleware/errorHandler';
import { getCacheStats } from '../../config/cache';

const router: Router = Router();

router.get('/stats/overview', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [alumni, distinguished, messages, pendingMessages, donations] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM alumni_system.alumni'),
    pool.query('SELECT COUNT(*) FROM alumni_system.distinguished_alumni'),
    pool.query('SELECT COUNT(*) FROM alumni_system.messages'),
    pool.query("SELECT COUNT(*) FROM alumni_system.messages WHERE status = 'pending'"),
    pool.query('SELECT COUNT(*), COALESCE(SUM(amount), 0) as total FROM alumni_system.donations'),
  ]);
  res.json({
    success: true,
    data: {
      totalAlumni: parseInt(alumni.rows[0].count),
      totalDistinguished: parseInt(distinguished.rows[0].count),
      totalMessages: parseInt(messages.rows[0].count),
      pendingMessages: parseInt(pendingMessages.rows[0].count),
      totalDonations: parseInt(donations.rows[0].count),
      totalDonationAmount: parseFloat(donations.rows[0].total || 0),
    },
  });
}));

router.get('/stats/trends', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count 
    FROM alumni_system.messages 
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at) ORDER BY date
  `);
  res.json({ success: true, data: result.rows });
}));

router.get('/stats/time-corridor', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT graduation_year, COUNT(*) as count 
    FROM alumni_system.alumni 
    WHERE graduation_year IS NOT NULL
    GROUP BY graduation_year ORDER BY graduation_year
  `);
  res.json({ success: true, data: result.rows });
}));

router.get('/stats/photos-by-year', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT year, COUNT(*) as count 
    FROM alumni_system.graduation_photos 
    WHERE year IS NOT NULL
    GROUP BY year ORDER BY year
  `);
  res.json({ success: true, data: result.rows });
}));

router.get('/stats/items-by-type', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(`
    SELECT item_type, COUNT(*) as count 
    FROM alumni_system.vintage_items 
    GROUP BY item_type ORDER BY count DESC
  `);
  res.json({ success: true, data: result.rows });
}));

// 缓存统计
router.get('/stats/cache', asyncHandler(async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: getCacheStats() });
}));

export default router;

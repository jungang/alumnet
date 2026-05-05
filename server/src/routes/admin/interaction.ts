/**
 * Admin 子路由 — 互动统计与导出
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { interactionStatsService } from '../../services/interactionStatsService';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = Router();

router.get('/interaction-stats', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await interactionStatsService.getOverview();
  res.json({ success: true, data: stats });
}));

router.get('/interaction-stats/trends', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { days = 30 } = req.query;
  const now = new Date();
  const startDate = new Date(now.getTime() - Number(days) * 24 * 60 * 60 * 1000);
  const trends = await interactionStatsService.getTrends(startDate, now);
  res.json({ success: true, data: trends });
}));

router.get('/interaction-export', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type = 'messages', startDate, endDate } = req.query;
  const dateRange = {
    startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: endDate ? new Date(endDate as string) : new Date(),
  };
  const csv = await interactionStatsService.exportData(type as any, dateRange);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=interaction-stats.csv');
  res.send(csv);
}));

export default router;

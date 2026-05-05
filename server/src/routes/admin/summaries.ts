/**
 * Admin 子路由 — 智能摘要服务
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { summaryService } from '../../services/summaryService';
import { asyncHandler } from '../../middleware/errorHandler';

const router: Router = Router();

// 获取活动摘要
router.get(
  '/summaries/activities',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 5 } = req.query;
    const activities = await summaryService.summarizeActivities(parseInt(limit as string));
    res.json({ success: true, data: activities });
  })
);

// 获取捐赠摘要
router.get(
  '/summaries/donations',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 5 } = req.query;
    const donations = await summaryService.summarizeDonations(parseInt(limit as string));
    res.json({ success: true, data: donations });
  })
);

// 获取通知摘要
router.get(
  '/summaries/notices',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 5 } = req.query;
    const notices = await summaryService.summarizeNotices(parseInt(limit as string));
    res.json({ success: true, data: notices });
  })
);

// 获取综合摘要（三合一）
router.get(
  '/summaries/all',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const summary = await summaryService.summarizeAll();
    res.json({ success: true, data: summary });
  })
);

export default router;

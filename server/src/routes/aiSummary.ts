/**
 * AI 生成摘要路由
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiSummaryService } from '../services/aiSummaryService';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router: Router = Router();

// 生成单个校友摘要
router.post(
  '/generate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { alumniId } = req.body;

    if (!alumniId) {
      throw new AppError('请提供校友ID', 400, 'VALIDATION_ERROR');
    }

    const summary = await aiSummaryService.generateAlumniSummary(alumniId);
    res.json({ success: true, data: summary });
  })
);

// 批量生成摘要 (管理端)
router.post(
  '/generate-batch',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { limit = 20 } = req.body;

    const summaries = await aiSummaryService.generateBatchSummaries(limit);
    res.json({ success: true, data: summaries });
  })
);

export default router;

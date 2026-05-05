/**
 * 问答助手路由
 * POST /api/qa/query - AI 问答
 */

import { Router, Request, Response } from 'express';
import { qaService } from '../services/qaService';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router: Router = Router();

// AI 问答
router.post(
  '/query',
  asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('请输入查询内容', 400, 'VALIDATION_ERROR');
    }

    if (query.length > 500) {
      throw new AppError('查询内容过长（最多 500 字符）', 400, 'VALIDATION_ERROR');
    }

    // 1. 分析查询
    const analysis = await qaService.analyzeQuery(query);

    // 2. 扩充上下文
    const context = await qaService.enrichContext(query, analysis);

    // 3. 生成回答
    const response = await qaService.generateResponse(query, analysis, context);

    res.json({
      success: true,
      data: {
        query,
        analysis,
        context,
        answer: response,
      },
    });
  })
);

export default router;

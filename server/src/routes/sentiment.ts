/**
 * 情感分析路由
 * POST /api/sentiment/analyze - 分析单条文本情感
 * POST /api/sentiment/batch - 批量分析文本情感
 */

import { Router, Request, Response } from 'express';
import { sentimentService } from '../services/sentimentService';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';

const router: Router = Router();

/**
 * 分析单条文本的情感倾向
 */
router.post(
  '/analyze',
  asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('请输入需要分析的文本');
    }

    if (text.length > 10000) {
      throw new ValidationError('文本过长（最多 10000 字符）');
    }

    // 情感分析
    const sentimentResult = sentimentService.analyzeSentiment(text);

    // 语气适配
    const toneAdaptation = sentimentService.getToneAdaptation(sentimentResult.sentiment);

    res.json({
      success: true,
      data: {
        ...sentimentResult,
        toneAdaptation,
      },
    });
  })
);

/**
 * 批量分析多条文本的情感倾向
 */
router.post(
  '/batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new ValidationError('请输入需要分析的文本数组');
    }

    if (texts.length > 100) {
      throw new ValidationError('批量分析最多支持 100 条文本');
    }

    // 验证每条文本
    for (let i = 0; i < texts.length; i++) {
      if (typeof texts[i] !== 'string') {
        throw new ValidationError(`第 ${i + 1} 条文本不是有效的字符串`);
      }
    }

    const result = sentimentService.batchAnalyze(texts);

    // 为整体情感倾向推荐语气
    const overallSentiment =
      result.summary.averageScore > 0.1
        ? ('positive' as const)
        : result.summary.averageScore < -0.1
          ? ('negative' as const)
          : ('neutral' as const);
    const toneAdaptation = sentimentService.getToneAdaptation(overallSentiment);

    res.json({
      success: true,
      data: {
        ...result,
        overallToneAdaptation: toneAdaptation,
      },
    });
  })
);

export default router;

/**
 * 话题生成路由
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { topicGenerationService } from '../services/topicGenerationService';
import { asyncHandler, AppError } from '../middleware/errorHandler';

const router: Router = Router();

// 生成话题
router.post(
  '/generate',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category, limit = 10 } = req.body;

    const topics = await topicGenerationService.generateTopics(category, limit);
    res.json({ success: true, data: topics });
  })
);

// 生成个性化话题（针对特定校友）
router.post(
  '/generate-personalized/:alumniId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const topics = await topicGenerationService.generatePersonalizedTopics(req.params.alumniId);
    res.json({ success: true, data: topics });
  })
);

// 获取话题分类
router.get(
  '/categories',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const categories = [
      { id: 'career', name: '职业发展', icon: 'briefcase' },
      { id: 'class', name: '班级活动', icon: 'users' },
      { id: 'campus', name: '母校建设', icon: 'school' },
      { id: 'donation', name: '捐赠项目', icon: 'heart' },
    ];
    res.json({ success: true, data: categories });
  })
);

export default router;

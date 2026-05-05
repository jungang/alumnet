/**
 * Admin 子路由 — 校友推荐
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { alumniRecommendationService } from '../../services/recommendationService';

const router: Router = Router();

// 同班推荐
router.get(
  '/recommendations/classmates/:alumniId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const recommendations = await alumniRecommendationService.recommendByClassmates(
      req.params.alumniId
    );
    res.json({ success: true, data: recommendations });
  })
);

// 同行业推荐
router.get(
  '/recommendations/industry/:alumniId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const recommendations = await alumniRecommendationService.recommendByIndustry(
      req.params.alumniId
    );
    res.json({ success: true, data: recommendations });
  })
);

// 同城市推荐
router.get(
  '/recommendations/location/:alumniId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const recommendations = await alumniRecommendationService.recommendByLocation(
      req.params.alumniId
    );
    res.json({ success: true, data: recommendations });
  })
);

// 活跃度Scores
router.get(
  '/recommendations/scores/:alumniId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await alumniRecommendationService.getProfileScores(req.params.alumniId);
    res.json({ success: true, data: result });
  })
);

export default router;

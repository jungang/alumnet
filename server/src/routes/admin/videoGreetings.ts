/**
 * Admin 子路由 — 视频寄语管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { videoGreetingService } from '../../services/videoGreetingService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, reviewVideoSchema, featureVideoSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/video-greetings', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, keyword, page, pageSize } = req.query;
  const result = await videoGreetingService.getList({
    status: status as any, keyword: keyword as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.get('/video-greetings/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await videoGreetingService.getById(req.params.id);
  if (!result) throw new NotFoundError('视频', req.params.id);
  res.json({ success: true, data: result });
}));

router.put('/video-greetings/:id/status', validate(reviewVideoSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, rejectionReason } = req.body;
  const result = await videoGreetingService.updateStatus(req.params.id, status, rejectionReason, req.userSession?.userId);
  await logOperation(req.userSession?.userId, 'review', 'video_greeting', req.params.id, { status, rejectionReason });
  res.json({ success: true, data: result });
}));

router.put('/video-greetings/:id/feature', validate(featureVideoSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { featured } = req.body;
  const result = await videoGreetingService.setFeatured(req.params.id, featured);
  await logOperation(req.userSession?.userId, 'feature', 'video_greeting', req.params.id, { featured });
  res.json({ success: true, data: result });
}));

router.delete('/video-greetings/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await videoGreetingService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'video_greeting', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

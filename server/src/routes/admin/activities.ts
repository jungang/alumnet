/**
 * Admin 子路由 — 校友活动/聚会管理
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { activityService } from '../../services/activityService';
import { asyncHandler, AppError } from '../../middleware/errorHandler';
import { logOperation } from '../../utils/logOperation';

const router: Router = Router();

// 获取活动列表
router.get('/activities', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const activities = await activityService.list();
  res.json({ success: true, data: activities });
}));

// 创建活动
router.post('/activities', asyncHandler(async (req: AuthRequest, res: Response) => {
  const activity = await activityService.create({
    ...req.body,
    creator_id: req.userSession?.userId,
  });
  await logOperation(req.userSession?.userId, 'create', 'activity', activity.id, { title: activity.title });
  res.json({ success: true, data: activity });
}));

// 获取活动详情
router.get('/activities/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const activity = await activityService.getById(req.params.id);
  if (!activity) throw new AppError('活动不存在', 404, 'NOT_FOUND');
  res.json({ success: true, data: activity });
}));

// 更新活动
router.put('/activities/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const activity = await activityService.update(req.params.id, req.body);
  await logOperation(req.userSession?.userId, 'update', 'activity', req.params.id, {});
  res.json({ success: true, data: activity });
}));

// 获取报名列表
router.get('/activities/:id/registrations', asyncHandler(async (req: AuthRequest, res: Response) => {
  const registrations = await activityService.getRegistrations(req.params.id);
  res.json({ success: true, data: registrations });
}));

// 签到
router.post('/activities/:id/check-in', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { alumniId } = req.body;
  if (!alumniId) throw new AppError('请指定校友', 400, 'VALIDATION_ERROR');
  await activityService.checkIn(req.params.id, alumniId);
  res.json({ success: true, message: '签到成功' });
}));

export default router;

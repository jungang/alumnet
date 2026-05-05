/**
 * Admin 子路由 — 寻人启事管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { searchNoticeService } from '../../services/searchNoticeService';
import { SearchNoticeStatus } from '../../types/models';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, reviewNoticeSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/notices', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, page, pageSize } = req.query;
  const result = await searchNoticeService.getList({
    status: status as SearchNoticeStatus | undefined,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.put('/notices/:id/status', validate(reviewNoticeSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, reunionStory } = req.body;
  const notice = await searchNoticeService.updateStatus(req.params.id, status as SearchNoticeStatus, reunionStory);
  if (!notice) throw new NotFoundError('寻人启事', req.params.id);
  await logOperation(req.userSession?.userId, 'review', 'notice', req.params.id, { status, reunionStory });
  res.json({ success: true, data: notice });
}));

router.delete('/notices/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await searchNoticeService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'notice', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

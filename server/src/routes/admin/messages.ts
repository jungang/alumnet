/**
 * Admin 子路由 — 留言管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { messageService } from '../../services/messageService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, reviewMessageSchema, batchReviewSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/messages', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, keyword, page, pageSize } = req.query;
  const result = await messageService.getList({
    status: status as any, keyword: keyword as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.get('/messages/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const message = await messageService.getById(req.params.id);
  if (!message) throw new NotFoundError('留言', req.params.id);
  res.json({ success: true, data: message });
}));

router.put('/messages/:id/status', validate(reviewMessageSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, rejectionReason } = req.body;
  const message = await messageService.updateStatus(req.params.id, status, req.userSession?.userId, rejectionReason);
  await logOperation(req.userSession?.userId, 'review', 'message', req.params.id, { status, rejectionReason });
  res.json({ success: true, data: message });
}));

router.post('/messages/batch-review', validate(batchReviewSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await messageService.batchReview(req.body, req.userSession?.userId);
  await logOperation(req.userSession?.userId, 'batch_review', 'message', undefined, req.body);
  res.json({ success: true, data: { count } });
}));

router.delete('/messages/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await messageService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'message', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

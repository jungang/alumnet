/**
 * Admin 子路由 — 校友新闻管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { alumniNewsService } from '../../services/alumniNewsService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, createNewsSchema, updateNewsSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/news', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, pageSize } = req.query;
  const result = await alumniNewsService.getList({
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.post('/news', validate(createNewsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const news = await alumniNewsService.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'news', news.id, req.body);
  res.json({ success: true, data: news });
}));

router.put('/news/:id', validate(updateNewsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const news = await alumniNewsService.update(req.params.id, req.body);
  if (!news) throw new NotFoundError('新闻', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'news', req.params.id, req.body);
  res.json({ success: true, data: news });
}));

router.delete('/news/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await alumniNewsService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'news', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

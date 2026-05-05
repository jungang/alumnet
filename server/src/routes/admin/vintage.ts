/**
 * Admin 子路由 — 老物件管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { vintageItemService } from '../../services/vintageItemService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, createVintageItemSchema, updateVintageItemSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/vintage-items', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { itemType, era, keyword, page, pageSize } = req.query;
  const result = await vintageItemService.getList({
    itemType: itemType as any, era: era as string, keyword: keyword as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.get('/vintage-items/options', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const options = await vintageItemService.getFilterOptions();
  res.json({ success: true, data: options });
}));

router.get('/vintage-items/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await vintageItemService.getById(req.params.id);
  if (!item) throw new NotFoundError('老物件', req.params.id);
  res.json({ success: true, data: item });
}));

router.post('/vintage-items', validate(createVintageItemSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await vintageItemService.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'vintage_item', item.id, req.body);
  res.json({ success: true, data: item });
}));

router.put('/vintage-items/:id', validate(updateVintageItemSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const item = await vintageItemService.update(req.params.id, req.body);
  if (!item) throw new NotFoundError('老物件', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'vintage_item', req.params.id, req.body);
  res.json({ success: true, data: item });
}));

router.delete('/vintage-items/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await vintageItemService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'vintage_item', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

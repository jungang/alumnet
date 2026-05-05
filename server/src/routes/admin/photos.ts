/**
 * Admin 子路由 — 毕业照管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { graduationPhotoService } from '../../services/graduationPhotoService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, createPhotoSchema, updatePhotoSchema, updateFaceTagsSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/photos', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { year, page, pageSize } = req.query;
  const result = await graduationPhotoService.getList({
    year: year ? parseInt(year as string) : undefined,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  } as any);
  res.json({ success: true, data: result });
}));

router.get('/photos/options', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const options = await graduationPhotoService.getFilterOptions();
  res.json({ success: true, data: options });
}));

router.get('/photos/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const photo = await graduationPhotoService.getById(req.params.id);
  if (!photo) throw new NotFoundError('毕业照', req.params.id);
  res.json({ success: true, data: photo });
}));

router.post('/photos', validate(createPhotoSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const photo = await graduationPhotoService.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'photo', photo.id, req.body);
  res.json({ success: true, data: photo });
}));

router.put('/photos/:id', validate(updatePhotoSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const photo = await graduationPhotoService.update(req.params.id, req.body);
  if (!photo) throw new NotFoundError('毕业照', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'photo', req.params.id, req.body);
  res.json({ success: true, data: photo });
}));

router.put('/photos/:id/tags', validate(updateFaceTagsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { faceTags } = req.body;
  const photo = await graduationPhotoService.updateFaceTags(req.params.id, faceTags);
  if (!photo) throw new NotFoundError('毕业照', req.params.id);
  await logOperation(req.userSession?.userId, 'tag', 'photo', req.params.id, { faceTags });
  res.json({ success: true, data: photo });
}));

router.delete('/photos/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await graduationPhotoService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'photo', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

/**
 * Admin 子路由 — 杰出校友管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { distinguishedAlumniService } from '../../services/distinguishedAlumniService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, createDistinguishedSchema, updateDistinguishedSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/distinguished', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { category, page, pageSize } = req.query;
  const result = await distinguishedAlumniService.getList({
    category: category as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 50,
  });
  res.json({ success: true, data: result });
}));

router.get('/distinguished/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const alumni = await distinguishedAlumniService.getById(req.params.id);
  if (!alumni) throw new NotFoundError('杰出校友', req.params.id);
  res.json({ success: true, data: alumni });
}));

router.get('/distinguished-categories', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const categories = await distinguishedAlumniService.getCategories();
  res.json({ success: true, data: categories });
}));

router.post('/distinguished', validate(createDistinguishedSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const alumni = await distinguishedAlumniService.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'distinguished', alumni.id, req.body);
  res.json({ success: true, data: alumni });
}));

router.put('/distinguished/:id', validate(updateDistinguishedSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const alumni = await distinguishedAlumniService.update(req.params.id, req.body);
  if (!alumni) throw new NotFoundError('杰出校友', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'distinguished', req.params.id, req.body);
  res.json({ success: true, data: alumni });
}));

router.delete('/distinguished/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await distinguishedAlumniService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'distinguished', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

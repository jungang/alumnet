/**
 * Admin 子路由 — 校友会管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { alumniAssociationService } from '../../services/alumniAssociationService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, createAssociationSchema, updateAssociationSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/associations', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, pageSize } = req.query;
  const result = await alumniAssociationService.getList({
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.post('/associations', validate(createAssociationSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const association = await alumniAssociationService.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'association', association.id, req.body);
  res.json({ success: true, data: association });
}));

router.put('/associations/:id', validate(updateAssociationSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const association = await alumniAssociationService.update(req.params.id, req.body);
  if (!association) throw new NotFoundError('校友会', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'association', req.params.id, req.body);
  res.json({ success: true, data: association });
}));

router.delete('/associations/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await alumniAssociationService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'association', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

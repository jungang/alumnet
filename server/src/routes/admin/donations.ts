/**
 * Admin 子路由 — 捐赠项目管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { donationProjectService } from '../../services/donationProjectService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, createDonationProjectSchema, updateDonationProjectSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/donation-projects', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, pageSize } = req.query;
  const result = await donationProjectService.getList({
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  } as any);
  res.json({ success: true, data: result });
}));

router.get('/donation-projects/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const project = await donationProjectService.getById(req.params.id);
  if (!project) throw new NotFoundError('捐赠项目', req.params.id);
  res.json({ success: true, data: project });
}));

router.get('/donation-projects/:id/records', asyncHandler(async (req: AuthRequest, res: Response) => {
  const records = await donationProjectService.getDonationRecords(req.params.id);
  res.json({ success: true, data: records });
}));

router.post('/donation-projects', validate(createDonationProjectSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const project = await donationProjectService.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'donation_project', project.id, req.body);
  res.json({ success: true, data: project });
}));

router.put('/donation-projects/:id', validate(updateDonationProjectSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const project = await donationProjectService.update(req.params.id, req.body);
  if (!project) throw new NotFoundError('捐赠项目', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'donation_project', req.params.id, req.body);
  res.json({ success: true, data: project });
}));

router.delete('/donation-projects/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await donationProjectService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'donation_project', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

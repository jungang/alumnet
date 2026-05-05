/**
 * Admin 子路由 — 班级名录管理
 * 合并了两处重复的 class-rosters 路由
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { classRosterService } from '../../services/classRosterService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { validate, createClassRosterSchema, updateClassRosterSchema, addStudentSchema, importStudentsSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/class-rosters', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page, pageSize } = req.query;
  const result = await classRosterService.getList({
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.get('/class-rosters/options', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const options = await classRosterService.getFilterOptions();
  res.json({ success: true, data: options });
}));

router.get('/class-rosters/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const roster = await classRosterService.getById(req.params.id);
  if (!roster) throw new NotFoundError('班级名录', req.params.id);
  res.json({ success: true, data: roster });
}));

router.post('/class-rosters', validate(createClassRosterSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const roster = await classRosterService.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'class_roster', roster.id, req.body);
  res.json({ success: true, data: roster });
}));

router.put('/class-rosters/:id', validate(updateClassRosterSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const roster = await classRosterService.update(req.params.id, req.body);
  if (!roster) throw new NotFoundError('班级名录', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'class_roster', req.params.id, req.body);
  res.json({ success: true, data: roster });
}));

router.delete('/class-rosters/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await classRosterService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'class_roster', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

router.post('/class-rosters/:id/photos/:photoId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await classRosterService.linkPhoto(req.params.id, req.params.photoId);
  await logOperation(req.userSession?.userId, 'add_photo', 'class_roster', req.params.id, { photoId: req.params.photoId });
  res.json({ success: true, data: result });
}));

router.delete('/class-rosters/:id/photos/:photoId', asyncHandler(async (req: AuthRequest, res: Response) => {
  await classRosterService.unlinkPhoto(req.params.id, req.params.photoId);
  await logOperation(req.userSession?.userId, 'remove_photo', 'class_roster', req.params.id, { photoId: req.params.photoId });
  res.json({ success: true, message: '移除成功' });
}));

// 学生管理
router.post('/class-rosters/:id/students', validate(addStudentSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await classRosterService.addStudent({ classId: req.params.id, ...req.body });
  await logOperation(req.userSession?.userId, 'add_student', 'class_roster', req.params.id, req.body);
  res.json({ success: true, data: student });
}));

router.put('/class-rosters/:classId/students/:studentId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const student = await classRosterService.updateStudent(req.params.studentId, req.body);
  await logOperation(req.userSession?.userId, 'update_student', 'class_roster', req.params.classId, { studentId: req.params.studentId, ...req.body });
  res.json({ success: true, data: student });
}));

router.delete('/class-rosters/:classId/students/:studentId', asyncHandler(async (req: AuthRequest, res: Response) => {
  await classRosterService.removeStudent(req.params.studentId);
  await logOperation(req.userSession?.userId, 'delete_student', 'class_roster', req.params.classId, { studentId: req.params.studentId });
  res.json({ success: true, message: '删除成功' });
}));

router.post('/class-rosters/:id/students/import', validate(importStudentsSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { students } = req.body;
  const result = await classRosterService.importStudents(req.params.id, students);
  await logOperation(req.userSession?.userId, 'import_students', 'class_roster', req.params.id, { count: students.length });
  res.json({ success: true, data: result });
}));

// class-rosters-options 兼容
router.get('/class-rosters-options', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const options = await classRosterService.getFilterOptions();
  res.json({ success: true, data: options });
}));

export default router;

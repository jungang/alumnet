/**
 * Admin 子路由 — 校友管理
 */

import { Router, Response } from 'express';
import multer from 'multer';
import { AuthRequest } from '../../middleware/auth';
import { alumniRepository } from '../../repositories/alumniRepository';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, AppError, NotFoundError } from '../../middleware/errorHandler';
import { validate, createAlumniSchema, updateAlumniSchema, importAlumniSchema } from '../../validation/schemas';
import { importService } from '../../services/importService';

const router: Router = Router();

// multer 内存存储（文件导入不需要落盘）
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 获取校友列表（管理端）
router.get('/alumni', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { keyword, page, pageSize } = req.query;
  const result = await alumniRepository.search({
    keyword: keyword as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

// 创建校友
router.post('/alumni', validate(createAlumniSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const alumni = await alumniRepository.create(req.body);
  await logOperation(req.userSession?.userId, 'create', 'alumni', alumni.id, req.body);
  res.json({ success: true, data: alumni });
}));

// 更新校友
router.put('/alumni/:id', validate(updateAlumniSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const alumni = await alumniRepository.update(id, req.body);
  if (!alumni) throw new NotFoundError('校友', id);
  await logOperation(req.userSession?.userId, 'update', 'alumni', id, req.body);
  res.json({ success: true, data: alumni });
}));

// 删除校友
router.delete('/alumni/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const success = await alumniRepository.delete(id);
  if (!success) throw new NotFoundError('校友', id);
  await logOperation(req.userSession?.userId, 'delete', 'alumni', id, { id });
  res.json({ success: true, message: '删除成功' });
}));

// 导入校友
router.post('/alumni/import', validate(importAlumniSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { alumni: alumniList, classId } = req.body;
  if (!Array.isArray(alumniList) || alumniList.length === 0) {
    throw new AppError('导入数据不能为空', 400, 'VALIDATION_ERROR');
  }
  if (alumniList.length > 500) {
    throw new AppError('单次导入不能超过500条', 400, 'VALIDATION_ERROR');
  }

  const results: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < alumniList.length; i++) {
    try {
      const alumniData = alumniList[i];
      if (classId) alumniData.classId = classId;
      const alumni = await alumniRepository.create(alumniData);
      results.push(alumni);
    } catch (error: any) {
      errors.push({ index: i, data: alumniList[i], error: error.message });
    }
  }

  await logOperation(req.userSession?.userId, 'import', 'alumni', undefined, {
    total: alumniList.length,
    success: results.length,
    failed: errors.length,
  });

  res.json({
    success: true,
    data: {
      total: alumniList.length,
      imported: results.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  });
}));

// 文件导入（CSV/JSON）
router.post('/alumni/import-file', uploadMemory.single('file'), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw new AppError('请上传文件', 400, 'VALIDATION_ERROR');
  }

  const file = req.file;
  const ext = file.originalname?.toLowerCase().split('.').pop();
  const classId = req.body.classId as string | undefined;
  const content = file.buffer.toString('utf-8');

  let rows: any[];

  try {
    if (ext === 'csv') {
      rows = importService.parseCSV(content);
    } else if (ext === 'json') {
      rows = importService.parseJSON(content);
    } else {
      throw new AppError('不支持的文件格式，请上传 CSV 或 JSON 文件', 400, 'VALIDATION_ERROR');
    }
  } catch (error: any) {
    throw new AppError(`文件解析失败: ${error.message}`, 400, 'PARSE_ERROR');
  }

  if (rows.length === 0) {
    throw new AppError('文件中无有效数据', 400, 'VALIDATION_ERROR');
  }

  const result = await importService.importData(rows, classId);

  await logOperation(req.userSession?.userId, 'import_file', 'alumni', undefined, {
    filename: file.originalname,
    format: ext,
    ...result,
  });

  res.json({ success: true, data: result });
}));

export default router;

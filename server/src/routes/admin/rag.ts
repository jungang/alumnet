/**
 * Admin 子路由 — 顶尖学者 + 知识库管理 + RAG 配置
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pool } from '../../config/database';
import { topScholarService } from '../../services/topScholarService';
import { ragService } from '../../services/ragService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, NotFoundError, ValidationError, AppError } from '../../middleware/errorHandler';
import { validate, createTopScholarSchema, updateTopScholarSchema, createKnowledgeBaseSchema, updateKnowledgeBaseSchema, updateRagConfigSchema } from '../../validation/schemas';

const router: Router = Router();

// ========== 顶尖学者 ==========

router.get('/top-scholars', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { keyword, page, pageSize } = req.query;
  const result = await topScholarService.getPaginated({
    keyword: keyword as string,
    page: page ? parseInt(page as string) : 1,
    pageSize: pageSize ? parseInt(pageSize as string) : 20,
  });
  res.json({ success: true, data: result });
}));

router.get('/top-scholars/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const scholar = await topScholarService.getById(req.params.id);
  if (!scholar) throw new NotFoundError('顶尖学者', req.params.id);
  res.json({ success: true, data: scholar });
}));

router.post('/top-scholars', validate(createTopScholarSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await topScholarService.create(req.body);
  if (result.errors && result.errors.length > 0) {
    throw new ValidationError(result.errors.map((e: any) => e.message || String(e)).join('; '));
  }
  if (!result.scholar) throw new AppError('创建失败', 500, 'INTERNAL_ERROR');
  await logOperation(req.userSession?.userId, 'create', 'top_scholar', result.scholar.id, req.body);
  res.json({ success: true, data: result.scholar });
}));

router.put('/top-scholars/:id', validate(updateTopScholarSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await topScholarService.update(req.params.id, req.body);
  if (result.errors && result.errors.length > 0) {
    throw new ValidationError(result.errors.map((e: any) => e.message || String(e)).join('; '));
  }
  if (!result.scholar) throw new NotFoundError('顶尖学者', req.params.id);
  await logOperation(req.userSession?.userId, 'update', 'top_scholar', req.params.id, req.body);
  res.json({ success: true, data: result.scholar });
}));

router.delete('/top-scholars/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await topScholarService.delete(req.params.id);
  await logOperation(req.userSession?.userId, 'delete', 'top_scholar', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

// ========== 知识库管理 ==========

router.get('/knowledge-base', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = 1, pageSize = 20, keyword, type } = req.query;
  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIndex = 1;

  if (keyword) {
    conditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
    params.push(`%${keyword}%`);
    paramIndex++;
  }
  if (type) {
    conditions.push(`type = $${paramIndex++}`);
    params.push(type);
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM alumni_system.knowledge_base WHERE ${conditions.join(' AND ')}`,
    params
  );

  const offset = (Number(page) - 1) * Number(pageSize);
  params.push(Number(pageSize), offset);

  const result = await pool.query(
    `SELECT id, title, type, status, source, LEFT(content, 200) as content_preview, created_at, updated_at
     FROM alumni_system.knowledge_base
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    params
  );

  res.json({
    success: true,
    data: {
      items: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
}));

router.get('/knowledge-base/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM alumni_system.knowledge_base WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) throw new NotFoundError('知识库条目', req.params.id);
  res.json({ success: true, data: result.rows[0] });
}));

router.post('/knowledge-base', validate(createKnowledgeBaseSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, type, content, source } = req.body;
  if (!title) throw new ValidationError('标题不能为空');

  const result = await pool.query(
    `INSERT INTO alumni_system.knowledge_base (title, type, content, source, status, created_at)
     VALUES ($1, $2, $3, $4, 'processing', NOW()) RETURNING *`,
    [title, type || 'text', content, source]
  );
  const item = result.rows[0];

  if (content) {
    ragService.addToKnowledge(content, { title, type: type || 'text', id: item.id, source }).catch(console.error);
    await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'completed' WHERE id = $1`, [item.id]);
  }

  await logOperation(req.userSession?.userId, 'create', 'knowledge_base', item.id, { title, type });
  res.json({ success: true, data: { ...item, status: 'completed' } });
}));

router.put('/knowledge-base/:id', validate(updateKnowledgeBaseSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, type, content, source, status } = req.body;
  const result = await pool.query(
    `UPDATE alumni_system.knowledge_base SET title = COALESCE($1, title), type = COALESCE($2, type),
     content = COALESCE($3, content), source = COALESCE($4, source), status = COALESCE($5, status),
     updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *`,
    [title, type, content, source, status, req.params.id]
  );
  if (result.rows.length === 0) throw new NotFoundError('知识库条目', req.params.id);

  if (content) {
    ragService.addToKnowledge(content, { title, type, id: req.params.id, source }).catch(console.error);
  }

  await logOperation(req.userSession?.userId, 'update', 'knowledge_base', req.params.id, req.body);
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/knowledge-base/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await pool.query('DELETE FROM alumni_system.knowledge_base WHERE id = $1', [req.params.id]);
  await logOperation(req.userSession?.userId, 'delete', 'knowledge_base', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

// 文本粘贴批量入库
router.post('/knowledge-base/batch-paste', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { items } = req.body as { items: Array<{ title: string; content: string; type?: string; source?: string }> };
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('请提供知识条目列表');
  }
  if (items.length > 50) {
    throw new ValidationError('单次批量导入不超过 50 条');
  }

  const results: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const { title, content, type = 'text', source = 'manual' } = items[i];
      if (!title || !content) { errors.push({ index: i, error: '标题和内容必填' }); continue; }

      const dbResult = await pool.query(
        `INSERT INTO alumni_system.knowledge_base (title, type, content, source, status) 
         VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
        [title, type, content, source]
      );
      const itemId = dbResult.rows[0].id;

      ragService.addToKnowledge(content, { title, type, id: itemId, source }).catch(() => {});
      await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'completed' WHERE id = $1`, [itemId]);

      results.push({ id: itemId, title });
    } catch (error: any) {
      errors.push({ index: i, error: error.message });
    }
  }

  await logOperation(req.userSession?.userId, 'batch_paste', 'knowledge_base', undefined, {
    total: items.length, success: results.length, failed: errors.length,
  });

  res.json({ success: true, data: { imported: results.length, failed: errors.length, errors: errors.length ? errors : undefined } });
}));

// 重新向量化单条
router.post('/knowledge-base/:id/reindex', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM alumni_system.knowledge_base WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) throw new NotFoundError('知识条目不存在');

  const item = result.rows[0];
  await ragService.addToKnowledge(item.content, { title: item.title, type: item.type, id: item.id, source: item.source });
  await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'completed' WHERE id = $1`, [item.id]);

  await logOperation(req.userSession?.userId, 'reindex', 'knowledge_base', item.id, { title: item.title });
  res.json({ success: true, message: '重新向量化完成' });
}));

// 批量重新向量化
router.post('/knowledge-base/batch-reindex', asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await pool.query('SELECT * FROM alumni_system.knowledge_base LIMIT 200');
  let reindexed = 0;

  for (const item of result.rows) {
    try {
      await ragService.addToKnowledge(item.content, { title: item.title, type: item.type, id: item.id, source: item.source });
      await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'completed' WHERE id = $1`, [item.id]);
      reindexed++;
    } catch { /* skip */ }
  }

  await logOperation(req.userSession?.userId, 'batch_reindex', 'knowledge_base', undefined, { total: result.rows.length, reindexed });
  res.json({ success: true, data: { total: result.rows.length, reindexed } });
}));

// ========== RAG 配置 ==========

router.get('/rag-config', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT config_key, config_value FROM alumni_system.system_config 
     WHERE config_key IN ('school_name', 'school_since', 'school_motto', 'rag_system_prompt')`
  );
  const config: Record<string, string> = {};
  result.rows.forEach((row: any) => { config[row.config_key] = row.config_value; });
  res.json({ success: true, data: config });
}));

router.put('/rag-config', validate(updateRagConfigSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const allowedKeys = ['school_name', 'school_since', 'school_motto', 'rag_system_prompt'];
  const updates = req.body;

  for (const [key, value] of Object.entries(updates)) {
    if (!allowedKeys.includes(key)) continue;
    await pool.query(
      `INSERT INTO alumni_system.system_config (config_key, config_value, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()`,
      [key, value as string]
    );
  }

  ragService.clearCache();
  await logOperation(req.userSession?.userId, 'update', 'rag_config', undefined, updates);
  res.json({ success: true, message: 'RAG 配置更新成功' });
}));

router.post('/rag-cache/clear', asyncHandler(async (req: AuthRequest, res: Response) => {
  ragService.clearCache();
  await logOperation(req.userSession?.userId, 'clear_cache', 'rag', undefined, {});
  res.json({ success: true, message: 'RAG 缓存已清除' });
}));

// 获取 RAG Token 预算使用情况
router.get('/token-usage', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const usage = ragService.getTokenBudgetUsage();
  res.json({ success: true, data: usage });
}));

export default router;

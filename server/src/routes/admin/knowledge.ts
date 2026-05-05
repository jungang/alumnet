/**
 * Admin 子路由 — 知识库管理
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { pool } from '../../config/database';
import { ragService } from '../../services/ragService';
import { logOperation } from '../../utils/logOperation';
import { asyncHandler, ValidationError } from '../../middleware/errorHandler';
import { validate, createKnowledgeTextSchema, createKnowledgeWebpageSchema } from '../../validation/schemas';

const router: Router = Router();

router.get('/knowledge', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await pool.query(
    `SELECT id, title, type, status, source, content, created_at as "createdAt"
     FROM alumni_system.knowledge_base ORDER BY created_at DESC`
  );
  res.json({ success: true, data: result.rows });
}));

router.post('/knowledge/text', validate(createKnowledgeTextSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content } = req.body;
  if (!title || !content) throw new ValidationError('标题和内容不能为空');

  const result = await pool.query(
    `INSERT INTO alumni_system.knowledge_base (title, type, content, status, created_at)
     VALUES ($1, 'text', $2, 'processing', NOW()) RETURNING id`,
    [title, content]
  );
  const id = result.rows[0].id;

  ragService.addToKnowledge(content, { title, type: 'text', id }).catch(console.error);
  await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'completed' WHERE id = $1`, [id]);

  await logOperation(req.userSession?.userId, 'create', 'knowledge', id, { title, type: 'text' });
  res.json({ success: true, data: { id, title, type: 'text', status: 'completed' } });
}));

router.post('/knowledge/webpage', validate(createKnowledgeWebpageSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { url, title } = req.body;
  if (!url) throw new ValidationError('网址不能为空');

  const result = await pool.query(
    `INSERT INTO alumni_system.knowledge_base (title, type, source, status, created_at)
     VALUES ($1, 'webpage', $2, 'processing', NOW()) RETURNING id`,
    [title || '网页内容', url]
  );
  const id = result.rows[0].id;

  try {
    const response = await fetch(url);
    const html = await response.text();
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 50000);

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = title || (titleMatch ? titleMatch[1].trim() : '网页内容');

    await pool.query(
      `UPDATE alumni_system.knowledge_base SET title = $1, content = $2, status = 'completed' WHERE id = $3`,
      [pageTitle, textContent, id]
    );
    ragService.addToKnowledge(textContent, { title: pageTitle, type: 'webpage', source: url, id }).catch(console.error);

    await logOperation(req.userSession?.userId, 'create', 'knowledge', id, { title: pageTitle, type: 'webpage', source: url });
    res.json({ success: true, data: { id, title: pageTitle, type: 'webpage', status: 'completed', source: url } });
  } catch (fetchError) {
    await pool.query(`UPDATE alumni_system.knowledge_base SET status = 'failed' WHERE id = $1`, [id]);
    throw new Error('网页抓取失败');
  }
}));

router.delete('/knowledge/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  await pool.query(`DELETE FROM alumni_system.knowledge_base WHERE id = $1`, [req.params.id]);
  await logOperation(req.userSession?.userId, 'delete', 'knowledge', req.params.id, { id: req.params.id });
  res.json({ success: true, message: '删除成功' });
}));

export default router;

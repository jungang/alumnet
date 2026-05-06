/**
 * 问答模板路由
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { qaTemplateService } from '../services/qaTemplateService';
import { asyncHandler } from '../middleware/errorHandler';

const router: Router = Router();

// 列出所有模板
router.get(
  '/templates',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const templates = qaTemplateService.listTemplates();
    res.json({ success: true, data: templates });
  })
);

// 获取当前角色的推荐模板
router.get(
  '/templates/recommended',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = req.userSession?.role || 'guest';
    const template = qaTemplateService.getTemplateByRole(role);
    res.json({ success: true, data: template });
  })
);

// 获取指定模板
router.get(
  '/templates/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = qaTemplateService.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }
    res.json({ success: true, data: template });
  })
);

// 使用模板构建 Prompt
router.post(
  '/templates/:id/build',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: '请提供查询内容' });
    }
    const prompt = qaTemplateService.buildPrompt(req.params.id, query);
    res.json({ success: true, data: { prompt } });
  })
);

export default router;

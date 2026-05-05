import { Router, Request, Response } from 'express';
import { alumniService } from '../services/alumniService';
import { ragService } from '../services/ragService';
import { ragLimiter } from '../middleware/rateLimit';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate, ragQuerySchema } from '../validation/schemas';

const router: Router = Router();

/**
 * @openapi
 * /api/alumni:
 *   get:
 *     summary: List all alumni
 *     tags: [Alumni]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of alumni
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await alumniService.search({ page: 1, pageSize: 20 }, 'guest', undefined);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取校友列表失败:', error);
    res.status(500).json({ success: false, message: '获取校友列表失败' });
  }
});

// 搜索校友（公开接口，供触控展示端使用）
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { keyword, yearStart, yearEnd, industry, className, page, pageSize } = req.query;

    const criteria = {
      keyword: keyword as string,
      yearStart: yearStart ? parseInt(yearStart as string) : undefined,
      yearEnd: yearEnd ? parseInt(yearEnd as string) : undefined,
      industry: industry as string,
      className: className as string,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    };

    const result = await alumniService.search(criteria, 'guest', undefined);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('搜索校友失败:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

// RAG智能查询 - 公开接口，供触控展示端使用
router.post('/rag-query', ragLimiter, validate(ragQuerySchema), async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: '查询内容不能为空' });
    }

    const result = await ragService.query(query);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('RAG查询失败:', error);
    res.status(500).json({ success: false, message: '智能查询失败' });
  }
});

// 获取筛选选项 (必须在 /:id 之前定义)
router.get('/filters', async (_req: Request, res: Response) => {
  try {
    const options = await alumniService.getFilterOptions();
    res.json({ success: true, data: options });
  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({ success: false, message: '获取筛选选项失败' });
  }
});

// 获取校友详情（公开接口，供触控展示端使用）
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alumni = await alumniService.getDetail(id, 'guest', undefined);

    if (!alumni) {
      return res.status(404).json({ success: false, message: '校友不存在' });
    }

    res.json({ success: true, data: alumni });
  } catch (error) {
    console.error('获取校友详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

// 获取推荐校友（公开接口，供触控展示端使用）
router.get('/:id/recommendations', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const recommendations = await alumniService.getRecommendations(id, 'guest', undefined);

    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('获取推荐校友失败:', error);
    res.status(500).json({ success: false, message: '获取推荐失败' });
  }
});

// 获取同班同学（公开接口，供触控展示端使用）
router.get('/:id/classmates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const classmates = await alumniService.getClassmates(id, 'guest', undefined);

    res.json({ success: true, data: classmates });
  } catch (error) {
    console.error('获取同班同学失败:', error);
    res.status(500).json({ success: false, message: '获取同班同学失败' });
  }
});

export default router;

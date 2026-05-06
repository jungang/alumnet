/**
 * AI 岗位匹配路由
 */
import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { jobMatcherService, JobDescription } from '../services/jobMatcherService';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';

const router: Router = Router();

/**
 * 校验职位描述
 */
function validateJobDescription(body: any): JobDescription {
  const { title, company, industry, skills, minExperienceYears, description } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new ValidationError('请提供职位标题 (title)');
  }

  return {
    title: title.trim(),
    company: company?.trim(),
    industry: industry?.trim(),
    skills: Array.isArray(skills) ? skills.map((s: string) => String(s).trim()) : undefined,
    minExperienceYears: minExperienceYears != null ? Number(minExperienceYears) : undefined,
    description: description?.trim(),
  };
}

/**
 * POST /api/job-matcher/match
 * 匹配校友到职位
 */
router.post(
  '/match',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { alumniId } = req.body;

    if (!alumniId || typeof alumniId !== 'string') {
      throw new ValidationError('请提供校友ID (alumniId)');
    }

    const job = validateJobDescription(req.body);
    const result = await jobMatcherService.matchJob(alumniId, job);

    res.json({ success: true, data: result });
  })
);

/**
 * POST /api/job-matcher/search
 * 搜索最佳匹配候选人
 */
router.post(
  '/search',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const job = validateJobDescription(req.body);
    const limit = Math.min(Math.max(Number(req.body.limit) || 10, 1), 50);

    const results = await jobMatcherService.searchCandidates(job, limit);

    res.json({
      success: true,
      data: {
        total: results.length,
        items: results,
      },
    });
  })
);

/**
 * POST /api/job-matcher/report
 * 生成详细匹配报告
 */
router.post(
  '/report',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { alumniId } = req.body;

    if (!alumniId || typeof alumniId !== 'string') {
      throw new ValidationError('请提供校友ID (alumniId)');
    }

    const job = validateJobDescription(req.body);
    const report = await jobMatcherService.generateMatchReport(alumniId, job);

    res.json({ success: true, data: report });
  })
);

export default router;

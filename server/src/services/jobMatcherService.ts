import { pool } from '../config/database';
import { alumniRepository } from '../repositories/alumniRepository';
import { Alumni } from '../types/models';
import logger from '../config/logger';

// ==================== 类型定义 ====================

export interface JobDescription {
  title: string;
  company?: string;
  industry?: string;
  skills?: string[];
  minExperienceYears?: number;
  description?: string;
}

export interface MatchResult {
  alumniId: string;
  name: string;
  className: string;
  graduationYear: number;
  industry?: string;
  workUnit?: string;
  totalScore: number;
  breakdown: {
    skills: { score: number; max: number; matched: string[]; missing: string[] };
    industry: { score: number; max: number; matched: boolean };
    experience: { score: number; max: number; yearsEstimate: number };
  };
}

export interface MatchReport {
  alumni: {
    id: string;
    name: string;
    className: string;
    graduationYear: number;
    industry?: string;
    workUnit?: string;
    currentCity?: string;
    biography?: string;
  };
  job: JobDescription;
  totalScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  breakdown: MatchResult['breakdown'];
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

// ==================== 行业关键词映射 ====================

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  信息技术: [
    'IT',
    '互联网',
    '软件',
    '计算机',
    '科技',
    '编程',
    '开发',
    '数据',
    '人工智能',
    'AI',
    '云计算',
    '大数据',
    'SaaS',
    '电商',
  ],
  金融: [
    '银行',
    '证券',
    '保险',
    '基金',
    '投资',
    '风控',
    '审计',
    '会计',
    '理财',
    'Fintech',
    '金融科技',
  ],
  教育: ['学校', '大学', '培训', '教学', '研究', '学术', '教授', '教师', '教育'],
  医疗: ['医院', '医药', '生物', '健康', '临床', '制药', '医疗器械', '生命科学'],
  制造业: ['工厂', '生产', '供应链', '工业', '机械', '自动化', '汽车', '电子'],
  房地产: ['地产', '建筑', '物业', '施工', '房地产', '城建'],
  法律: ['律师', '律所', '法务', '合规', '知识产权', '法律'],
  传媒: ['媒体', '新闻', '广告', '公关', '出版', '影视', '内容', '自媒体'],
  政府: ['政府', '机关', '公务', '行政', '公共管理', '事业单位'],
  能源: ['电力', '石油', '新能源', '环保', '碳中和', '光伏'],
  零售: ['零售', '消费品', '快消', '品牌', '连锁', '商超'],
  物流: ['物流', '运输', '仓储', '快递', '供应链'],
};

// 常见技能关键词
const SKILL_PATTERNS: Record<string, string[]> = {
  // 技术类
  编程: ['编程', '开发', '程序员', 'coding', 'developer', 'engineer'],
  管理: ['管理', '经理', '总监', 'VP', '负责人', '领导', 'team lead', 'manager', 'director'],
  产品: ['产品', 'PM', '产品经理', 'product'],
  设计: ['设计', 'UI', 'UX', '设计师', 'designer'],
  运营: ['运营', 'marketing', '市场', '推广', 'growth'],
  销售: ['销售', '商务', 'BD', '客户', 'sales'],
  财务: ['财务', 'CFO', '会计', '审计', 'finance', 'accounting'],
  人力: ['人力', 'HR', '招聘', '组织', 'HRD'],
  法务: ['法务', '法律', '律师', 'legal', 'compliance'],
  研发: ['研发', 'R&D', 'research', '科学家', 'scientist'],
  数据分析: ['数据分析', 'data analysis', 'BI', '统计', 'statistic'],
  项目管理: ['项目管理', 'PMP', 'project management', 'PMO'],
  人工智能: ['人工智能', 'AI', '机器学习', 'ML', '深度学习', 'DL', 'NLP', 'CV'],
  架构: ['架构', 'architect', '系统设计', 'system design'],
  测试: ['测试', 'QA', '质量', 'quality', 'automation test'],
  安全: ['安全', 'security', '网络安全', '信息安全', 'cybersecurity'],
  咨询: ['咨询', 'consulting', '顾问', 'consultant', 'strategy'],
  创业: ['创业', 'founder', 'CEO', 'co-founder', '联合创始人'],
};

// ==================== 服务实现 ====================

export class JobMatcherService {
  /**
   * 匹配单个校友到职位
   */
  async matchJob(alumniId: string, job: JobDescription): Promise<MatchResult> {
    const alumni = await alumniRepository.findById(alumniId);
    if (!alumni) {
      throw new Error(`校友 ${alumniId} 不存在`);
    }

    return this.calculateMatchScore(alumni, job);
  }

  /**
   * 计算校友与职位的匹配分数
   *
   * 评分结构（0-100）:
   * - 技能匹配 (0-40): 关键词命中率
   * - 行业匹配 (0-30): 行业相关度
   * - 经验匹配 (0-30): 基于毕业年份的工作年限估算
   */
  calculateMatchScore(alumni: Alumni, job: JobDescription): MatchResult {
    const skillsResult = this.scoreSkills(alumni, job);
    const industryResult = this.scoreIndustry(alumni, job);
    const experienceResult = this.scoreExperience(alumni, job);

    const totalScore = Math.round(
      skillsResult.score + industryResult.score + experienceResult.score
    );

    return {
      alumniId: alumni.id,
      name: alumni.name,
      className: alumni.className,
      graduationYear: alumni.graduationYear,
      industry: alumni.industry,
      workUnit: alumni.workUnit,
      totalScore,
      breakdown: {
        skills: skillsResult,
        industry: industryResult,
        experience: experienceResult,
      },
    };
  }

  /**
   * 搜索最佳匹配候选人
   */
  async searchCandidates(job: JobDescription, limit: number = 10): Promise<MatchResult[]> {
    // 1. 从数据库获取所有活跃校友（分批处理）
    const candidates = await this.fetchAllActiveAlumni();

    // 2. 计算每个候选人的匹配分数
    const results = candidates.map((alumni) => this.calculateMatchScore(alumni, job));

    // 3. 按总分降序排序
    results.sort((a, b) => b.totalScore - a.totalScore);

    // 4. 返回 top N
    return results.slice(0, limit);
  }

  /**
   * 生成详细的匹配报告
   */
  async generateMatchReport(alumniId: string, job: JobDescription): Promise<MatchReport> {
    const alumni = await alumniRepository.findById(alumniId);
    if (!alumni) {
      throw new Error(`校友 ${alumniId} 不存在`);
    }

    const matchResult = this.calculateMatchScore(alumni, job);

    // 确定等级
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    if (matchResult.totalScore >= 90) grade = 'S';
    else if (matchResult.totalScore >= 75) grade = 'A';
    else if (matchResult.totalScore >= 60) grade = 'B';
    else if (matchResult.totalScore >= 40) grade = 'C';
    else grade = 'D';

    // 生成优势和差距分析
    const strengths = this.identifyStrengths(matchResult, alumni);
    const gaps = this.identifyGaps(matchResult, job);

    // 生成推荐建议
    const recommendation = this.generateRecommendation(matchResult, grade, alumni, job);

    return {
      alumni: {
        id: alumni.id,
        name: alumni.name,
        className: alumni.className,
        graduationYear: alumni.graduationYear,
        industry: alumni.industry,
        workUnit: alumni.workUnit,
        currentCity: alumni.currentCity,
        biography: alumni.biography,
      },
      job,
      totalScore: matchResult.totalScore,
      grade,
      breakdown: matchResult.breakdown,
      strengths,
      gaps,
      recommendation,
    };
  }

  // ==================== 评分子方法 ====================

  /**
   * 技能匹配评分 (0-40)
   * 比较职位要求技能与校友的 industry, work_unit, extra_info, biography
   */
  private scoreSkills(
    alumni: Alumni,
    job: JobDescription
  ): { score: number; max: number; matched: string[]; missing: string[] } {
    const maxScore = 40;

    // 从校友信息中提取文本关键词
    const alumniText = this.buildAlumniText(alumni);
    const alumniKeywords = this.extractKeywords(alumniText);

    // 从职位中提取技能关键词
    const jobSkills = this.extractJobSkills(job);

    if (jobSkills.length === 0) {
      // 如果没有提取到技能要求，给中等分数
      return { score: 20, max: maxScore, matched: [], missing: [] };
    }

    // 计算匹配
    const matched: string[] = [];
    const missing: string[] = [];

    for (const skill of jobSkills) {
      const isMatched = alumniKeywords.some(
        (kw) =>
          kw.toLowerCase() === skill.toLowerCase() ||
          kw.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(kw.toLowerCase())
      );
      if (isMatched) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    }

    // 分数 = 命中率 * maxScore
    const hitRate = matched.length / jobSkills.length;
    const score = Math.round(hitRate * maxScore);

    return { score, max: maxScore, matched, missing };
  }

  /**
   * 行业匹配评分 (0-30)
   * 比较职位行业与校友行业
   */
  private scoreIndustry(
    alumni: Alumni,
    job: JobDescription
  ): { score: number; max: number; matched: boolean } {
    const maxScore = 30;

    if (!job.industry && !job.company && !job.description) {
      // 没有行业信息，给中等分数
      return { score: 15, max: maxScore, matched: false };
    }

    // 构建职位的行业关键词集
    const jobIndustryKeywords = this.extractIndustryKeywords(job);
    const alumniIndustry = alumni.industry?.toLowerCase() || '';
    const alumniWorkUnit = alumni.workUnit?.toLowerCase() || '';
    const alumniText = `${alumniIndustry} ${alumniWorkUnit}`.toLowerCase();

    // 检查校友行业是否匹配
    let matched = false;
    let matchScore = 0;

    // 精确匹配行业名称
    if (alumniIndustry && job.industry) {
      const jobIndLower = job.industry.toLowerCase();
      if (alumniIndustry === jobIndLower) {
        matched = true;
        matchScore = maxScore;
      } else if (alumniIndustry.includes(jobIndLower) || jobIndLower.includes(alumniIndustry)) {
        matched = true;
        matchScore = Math.round(maxScore * 0.8);
      }
    }

    // 关键词匹配
    if (!matched && jobIndustryKeywords.length > 0) {
      const alumniKeywords = this.extractKeywords(alumniText);
      let keywordHits = 0;
      for (const kw of jobIndustryKeywords) {
        if (
          alumniKeywords.some(
            (ak) =>
              ak.toLowerCase().includes(kw.toLowerCase()) ||
              kw.toLowerCase().includes(ak.toLowerCase())
          )
        ) {
          keywordHits++;
        }
      }
      if (keywordHits > 0) {
        matched = true;
        matchScore = Math.round((keywordHits / jobIndustryKeywords.length) * maxScore * 0.7);
      }
    }

    // 间接匹配：通过行业关键词映射表
    if (!matched && alumniIndustry) {
      for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
        const isAlumniIndustry =
          alumniIndustry.includes(industry.toLowerCase()) ||
          industry.toLowerCase().includes(alumniIndustry);
        if (isAlumniIndustry) {
          // 校友属于这个行业，检查职位是否相关
          const jobText =
            `${job.industry || ''} ${job.company || ''} ${job.description || ''}`.toLowerCase();
          const isRelated = keywords.some((kw) => jobText.includes(kw.toLowerCase()));
          if (isRelated) {
            matched = true;
            matchScore = Math.round(maxScore * 0.6);
            break;
          }
        }
      }
    }

    return { score: matchScore, max: maxScore, matched };
  }

  /**
   * 经验匹配评分 (0-30)
   * 基于毕业年份估算工作年限
   */
  private scoreExperience(
    alumni: Alumni,
    job: JobDescription
  ): { score: number; max: number; yearsEstimate: number } {
    const maxScore = 30;
    const currentYear = new Date().getFullYear();

    // 估算工作年限 = 当前年份 - 毕业年份
    const yearsEstimate = Math.max(0, currentYear - alumni.graduationYear);

    if (!job.minExperienceYears) {
      // 没有经验要求，根据工作年限给分
      if (yearsEstimate >= 10) return { score: maxScore, max: maxScore, yearsEstimate };
      if (yearsEstimate >= 5)
        return { score: Math.round(maxScore * 0.8), max: maxScore, yearsEstimate };
      if (yearsEstimate >= 3)
        return { score: Math.round(maxScore * 0.6), max: maxScore, yearsEstimate };
      if (yearsEstimate >= 1)
        return { score: Math.round(maxScore * 0.4), max: maxScore, yearsEstimate };
      return { score: Math.round(maxScore * 0.2), max: maxScore, yearsEstimate };
    }

    const required = job.minExperienceYears;

    // 完全满足
    if (yearsEstimate >= required) {
      // 略高于要求的经验更有价值，但不超过1.5倍
      const ratio = Math.min(yearsEstimate / required, 1.5);
      const score = Math.round(maxScore * Math.min(1, ratio));
      return { score, max: maxScore, yearsEstimate };
    }

    // 经验不足
    const ratio = yearsEstimate / required;
    const score = Math.round(maxScore * ratio);
    return { score, max: maxScore, yearsEstimate };
  }

  // ==================== 关键词提取 ====================

  /**
   * 从校友信息构建可搜索文本
   */
  private buildAlumniText(alumni: Alumni): string {
    const parts: string[] = [];

    if (alumni.industry) parts.push(alumni.industry);
    if (alumni.workUnit) parts.push(alumni.workUnit);
    if (alumni.biography) parts.push(alumni.biography);
    if (alumni.currentCity) parts.push(alumni.currentCity);

    // 从 extraInfo 中提取有价值的文本
    if (alumni.extraInfo) {
      const extra = alumni.extraInfo;
      if (extra.achievement) parts.push(String(extra.achievement));
      if (extra.category) parts.push(String(extra.category));
      // 递归提取所有字符串值
      this.extractTextFromObject(extra, parts);
    }

    return parts.join(' ');
  }

  /**
   * 递归提取对象中的文本
   */
  private extractTextFromObject(obj: Record<string, any>, result: string[]): void {
    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && value.length > 1) {
        result.push(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.length > 1) {
            result.push(item);
          } else if (typeof item === 'object' && item !== null) {
            this.extractTextFromObject(item, result);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        this.extractTextFromObject(value, result);
      }
    }
  }

  /**
   * 中文分词 + 关键词提取（简化版）
   * 使用正向最大匹配 + 常见技能词表
   */
  private extractKeywords(text: string): string[] {
    if (!text) return [];

    const keywords: string[] = [];
    const normalized = text.toLowerCase().replace(/[，。、；：""''（）【】《》\s]+/g, ' ');

    // 1. 从技能词表中匹配
    for (const [category, patterns] of Object.entries(SKILL_PATTERNS)) {
      for (const pattern of patterns) {
        if (normalized.includes(pattern.toLowerCase())) {
          keywords.push(category);
          break; // 每个类别只匹配一次
        }
      }
    }

    // 2. 从行业关键词表中匹配
    for (const [industry, kws] of Object.entries(INDUSTRY_KEYWORDS)) {
      for (const kw of kws) {
        if (normalized.includes(kw.toLowerCase())) {
          keywords.push(industry);
          break;
        }
      }
    }

    // 3. 提取英文关键词（2+字符的英文单词）
    const englishWords = normalized.match(/[a-z]{2,}/g) || [];
    keywords.push(...englishWords.filter((w) => w.length >= 2));

    // 4. 提取中文关键词（2-4字连续中文）
    const chineseSegments = normalized.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    keywords.push(...chineseSegments);

    // 去重
    return [...new Set(keywords)];
  }

  /**
   * 从职位描述中提取技能关键词
   */
  private extractJobSkills(job: JobDescription): string[] {
    const skills: string[] = [];

    // 直接指定的技能
    if (job.skills && job.skills.length > 0) {
      skills.push(...job.skills);
    }

    // 从描述中提取
    const fullText = `${job.title} ${job.description || ''} ${job.company || ''}`;
    const extractedKeywords = this.extractKeywords(fullText);
    skills.push(...extractedKeywords);

    // 去重
    return [...new Set(skills)];
  }

  /**
   * 从职位信息中提取行业关键词
   */
  private extractIndustryKeywords(job: JobDescription): string[] {
    const keywords: string[] = [];

    if (job.industry) {
      keywords.push(job.industry);
      // 查找关联的行业关键词
      for (const [industry, kws] of Object.entries(INDUSTRY_KEYWORDS)) {
        if (industry.includes(job.industry) || job.industry.includes(industry)) {
          keywords.push(...kws);
        }
      }
    }

    // 从公司名和描述中提取行业线索
    const text = `${job.company || ''} ${job.description || ''}`.toLowerCase();
    for (const [industry, kws] of Object.entries(INDUSTRY_KEYWORDS)) {
      if (kws.some((kw) => text.includes(kw.toLowerCase()))) {
        keywords.push(industry);
      }
    }

    return [...new Set(keywords)];
  }

  // ==================== 报告生成 ====================

  /**
   * 识别优势
   */
  private identifyStrengths(matchResult: MatchResult, alumni: Alumni): string[] {
    const strengths: string[] = [];
    const { breakdown } = matchResult;

    // 技能优势
    if (breakdown.skills.score >= 30) {
      strengths.push(`技能高度匹配（${breakdown.skills.matched.join('、')}）`);
    } else if (breakdown.skills.score >= 20) {
      strengths.push(`具备部分所需技能（${breakdown.skills.matched.join('、')}）`);
    }

    // 行业优势
    if (breakdown.industry.matched) {
      strengths.push(`${alumni.industry || '相关'}行业经验`);
    }

    // 经验优势
    if (breakdown.experience.yearsEstimate >= 10) {
      strengths.push(`${breakdown.experience.yearsEstimate}年丰富工作经验`);
    } else if (breakdown.experience.yearsEstimate >= 5) {
      strengths.push(`${breakdown.experience.yearsEstimate}年工作经验`);
    }

    // 工作单位优势
    if (alumni.workUnit) {
      strengths.push(`${alumni.workUnit}工作背景`);
    }

    return strengths;
  }

  /**
   * 识别差距
   */
  private identifyGaps(matchResult: MatchResult, job: JobDescription): string[] {
    const gaps: string[] = [];
    const { breakdown } = matchResult;

    // 技能差距
    if (breakdown.skills.missing.length > 0) {
      gaps.push(`缺少技能：${breakdown.skills.missing.join('、')}`);
    }

    // 行业差距
    if (!breakdown.industry.matched) {
      gaps.push(`行业背景不匹配（${job.industry || '目标行业'}）`);
    }

    // 经验差距
    if (job.minExperienceYears && breakdown.experience.yearsEstimate < job.minExperienceYears) {
      const gap = job.minExperienceYears - breakdown.experience.yearsEstimate;
      gaps.push(`工作经验不足，相差约${gap}年`);
    }

    return gaps;
  }

  /**
   * 生成推荐建议
   */
  private generateRecommendation(
    matchResult: MatchResult,
    grade: string,
    alumni: Alumni,
    job: JobDescription
  ): string {
    const { totalScore, breakdown } = matchResult;

    if (grade === 'S' || grade === 'A') {
      return (
        `${alumni.name}与"${job.title}"高度匹配（${totalScore}分），建议优先推荐。` +
        (breakdown.skills.matched.length > 0
          ? `核心技能${breakdown.skills.matched.join('、')}完全吻合。`
          : '') +
        (breakdown.industry.matched ? '行业背景一致。' : '')
      );
    }

    if (grade === 'B') {
      return (
        `${alumni.name}与"${job.title}"较为匹配（${totalScore}分），可作为候选推荐。` +
        (breakdown.skills.missing.length > 0
          ? `需关注技能差距：${breakdown.skills.missing.join('、')}。`
          : '') +
        (!breakdown.industry.matched ? '行业有差异但可迁移。' : '')
      );
    }

    if (grade === 'C') {
      return (
        `${alumni.name}与"${job.title}"部分匹配（${totalScore}分），存在明显差距。` +
        (breakdown.skills.missing.length > 0
          ? `关键缺失技能：${breakdown.skills.missing.join('、')}。`
          : '') +
        (!breakdown.industry.matched ? '行业背景差异较大。' : '')
      );
    }

    return (
      `${alumni.name}与"${job.title}"匹配度较低（${totalScore}分），不建议优先推荐。` +
      '建议寻找更匹配的候选人或调整岗位要求。'
    );
  }

  // ==================== 数据库查询 ====================

  /**
   * 获取所有活跃校友（批量处理）
   */
  private async fetchAllActiveAlumni(): Promise<Alumni[]> {
    const result = await pool.query(
      `SELECT id, name, graduation_year, class_name, industry, current_city, work_unit,
              phone, email, phone_visibility, email_visibility, status, biography,
              photo_url, extra_info, created_at, updated_at
       FROM alumni_system.alumni
       WHERE status = 'active'
       ORDER BY graduation_year DESC`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      studentId: row.student_id,
      graduationYear: row.graduation_year,
      className: row.class_name,
      industry: row.industry,
      currentCity: row.current_city,
      workUnit: row.work_unit,
      phone: row.phone,
      email: row.email,
      phoneVisibility: row.phone_visibility,
      emailVisibility: row.email_visibility,
      status: row.status,
      biography: row.biography,
      photoUrl: row.photo_url,
      extraInfo: typeof row.extra_info === 'string' ? JSON.parse(row.extra_info) : row.extra_info,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

export const jobMatcherService = new JobMatcherService();

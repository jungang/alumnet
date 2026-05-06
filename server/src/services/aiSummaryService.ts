/**
 * AI 生成校友档案摘要服务
 * 基于校友的多个数据源，自动生成个性化简介
 */

import { pool } from '../config/database';
import { ragService } from './ragService';
import logger from '../config/logger';

interface GeneratedSummary {
  alumniId: string;
  name: string;
  summary: string;
  keyPoints: string[];
  tags: string[];
  lastUpdated: string;
}

interface SummaryContext {
  basicInfo: {
    name: string;
    graduationYear: number;
    className: string;
    industry: string;
    workUnit: string;
    currentCity: string;
  };
  achievements: string[];
  activities: {
    donationCount: number;
    donationTotal: number;
    messageCount: number;
    commentCount: number;
    postLikeCount: number;
  };
  network: {
    classmatesCount: number;
    sameIndustryCount: number;
    sameCityCount: number;
  };
}

class AIGenerateSummaryService {
  /**
   * 生成校友档案摘要
   * 组合：基本信息 + 成就 + 互动 + 网络
   */
  async generateAlumniSummary(alumniId: string): Promise<GeneratedSummary> {
    // 1. 获取学生基本数据
    const [basic, achievements, activities, network] = await Promise.all([
      this.getBasicInfo(alumniId),
      this.getAchievements(alumniId),
      this.getActivityStats(alumniId),
      this.getNetworkStats(alumniId),
    ]);

    const context = {
      basicInfo: basic,
      achievements: achievements,
      activities,
      network,
    };

    // 2. 构造 Prompt 并调用 LLM
    const prompt = this.buildSummaryPrompt(context);
    const summaryText = await this.generateSummaryViaLLM(prompt);

    // 3. 解析摘要结构
    const { summary, keyPoints, tags } = this.parseSummaryResponse(summaryText);

    return {
      alumniId,
      name: basic.name,
      summary,
      keyPoints,
      tags,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * 批量生成摘要 (用于预热)
   */
  async generateBatchSummaries(limit: number = 20): Promise<GeneratedSummary[]> {
    const result = await pool.query(
      `SELECT id, name, student_id, graduation_year, class_name, industry, 
              work_unit, current_city
       FROM alumni_system.alumni 
       ORDER BY graduation_year DESC
       LIMIT $1`,
      [limit]
    );

    const summaries: GeneratedSummary[] = [];
    for (const alumni of result.rows) {
      try {
        const summary = await this.generateAlumniSummary(alumni.id);
        summaries.push(summary);
      } catch (error) {
        logger.error({ alumniId: alumni.id, error }, '生成摘要失败');
      }
    }

    return summaries;
  }

  // 私有方法

  private async getBasicInfo(alumniId: string): Promise<SummaryContext['basicInfo']> {
    const result = await pool.query(
      `SELECT name, student_id, graduation_year, class_name, industry, 
              work_unit, current_city
       FROM alumni_system.alumni 
       WHERE id = $1`,
      [alumniId]
    );
    return result.rows[0];
  }

  private async getAchievements(alumniId: string): Promise<string[]> {
    const achievements: string[] = [];

    // 检查杰出校友
    const distinguished = await pool.query(
      `SELECT category, title FROM alumni_system.distinguished_alumni 
       WHERE alumni_id = $1`,
      [alumniId]
    );
    for (const row of distinguished.rows) {
      achievements.push(`${row.category}: ${row.title}`);
    }

    // 检查捐赠记录
    const donation = await pool.query(
      `SELECT SUM(amount) as total, COUNT(*) as count 
       FROM alumni_system.donations 
       WHERE donor_id = $1`,
      [alumniId]
    );
    if (donation.rows[0].total && donation.rows[0].total > 0) {
      achievements.push(`捐赠 ${donation.rows[0].count} 次，累计 ${donation.rows[0].total} 元`);
    }

    // 从 RAG 知识库查询相关成就
    const alumniResult = await pool.query(`SELECT name FROM alumni_system.alumni WHERE id = $1`, [
      alumniId,
    ]);
    const ragResult = await ragService.query(`${alumniResult.rows[0].name} 成就`);
    if (ragResult.relatedAlumni && ragResult.relatedAlumni.length > 0) {
      achievements.push(...ragResult.relatedAlumni.map((a) => a.name + ' - 相关成就'));
    }

    return achievements.slice(0, 5);
  }

  private async getActivityStats(alumniId: string): Promise<SummaryContext['activities']> {
    const [messages, comments, likes, donations] = await Promise.all([
      pool.query(`SELECT COUNT(*) as cnt FROM alumni_system.messages WHERE alumni_id = $1`, [
        alumniId,
      ]),
      pool.query(`SELECT COUNT(*) as cnt FROM alumni_system.comments WHERE alumni_id = $1`, [
        alumniId,
      ]),
      pool.query(`SELECT COUNT(*) as cnt FROM alumni_system.post_likes WHERE alumni_id = $1`, [
        alumniId,
      ]),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count 
         FROM alumni_system.donations WHERE donor_id = $1`,
        [alumniId]
      ),
    ]);

    return {
      donationCount: donations.rows[0].count,
      donationTotal: Number(donations.rows[0].total),
      messageCount: messages.rows[0].cnt,
      commentCount: comments.rows[0].cnt,
      postLikeCount: likes.rows[0].cnt,
    };
  }

  private async getNetworkStats(alumniId: string): Promise<SummaryContext['network']> {
    // 同班人数
    const classResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM alumni_system.alumni WHERE class_name = (
         SELECT class_name FROM alumni_system.alumni WHERE id = $1
       ) AND id != $1`,
      [alumniId]
    );

    // 同行业人数
    const industryResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM alumni_system.alumni WHERE industry = (
         SELECT industry FROM alumni_system.alumni WHERE id = $1
       ) AND id != $1`,
      [alumniId]
    );

    // 同城市人数
    const cityResult = await pool.query(
      `SELECT COUNT(*) as cnt FROM alumni_system.alumni WHERE current_city = (
         SELECT current_city FROM alumni_system.alumni WHERE id = $1
       ) AND id != $1`,
      [alumniId]
    );

    return {
      classmatesCount: classResult.rows[0].cnt,
      sameIndustryCount: industryResult.rows[0].cnt,
      sameCityCount: cityResult.rows[0].cnt,
    };
  }

  private buildSummaryPrompt(context: SummaryContext): string {
    const { basicInfo, achievements, activities, network } = context;

    return `你是一名专业的校友档案编辑，负责为育文中学校友生成个性化摘要。

【校友基本信息】
- 姓名：${basicInfo.name}
- 毕业年份：${basicInfo.graduationYear}届
- 班级：${basicInfo.className || '未知'}
- 行业：${basicInfo.industry || '未知'}
- 公司：${basicInfo.workUnit || '未知'}
- 城市：${basicInfo.currentCity || '未知'}

【主要成就】${achievements.length > 0 ? achievements.map((a) => `- ${a}`).join('\n') : '暂无记录'}

【校友互动 数据】
- 捐赠：${activities.donationCount} 次，累计 ${activities.donationTotal} 元
- 留言：${activities.messageCount} 条
- 评论：${activities.commentCount} 条
- 点赞：${activities.postLikeCount} 次

【校友网络 数据】
- 同班同学：${network.classmatesCount} 人
- 同行业校友：${network.sameIndustryCount} 人
- 同城市校友：${network.sameCityCount} 人

【生成要求】
1. 摘要长度：120-150 字
2. 语气：正式、温暖、体现校友情怀
3. 优先突出：行业成就 + 捐赠贡献 + 校友网络
4. 避免：流水账、重复信息、过度吹捧
5. 输出格式：Markdown ( headings: no, lists: yes, bold: yes )

请生成校友 ${basicInfo.name} 的档案摘要。`;
  }

  private async generateSummaryViaLLM(prompt: string): Promise<string> {
    // TODO: 集成真实 LLM (Qwen/Kimi/GLM)
    // 这里使用 mock 实现
    return `**${prompt.match(/姓名：(.*?)[\n，]/)?.[1] || '校友'}**，${prompt.match(/毕业年份：(\d+)届/)?.[1] || 'X'}届校友，${prompt.match(/行业：(.*?)[\n，]/)?.[1] || '从事'}行业，目前在${prompt.match(/公司：(.*?)[\n，]/)?.[1] || '某单位'}任职。

${prompt.match(/主要成就】(.+?)【校友互动/)?.[1]?.split('\n')[0] || '在多个领域取得显著成就'}。

热心校友情谊，捐资助学 ${prompt.match(/累计 (\d+)</)?.[1] || '若干'}元，积极参与${prompt.match(/同班同学：(\d+)/)?.[1] || '多场'}同班活动。`!;
  }

  private parseSummaryResponse(text: string): {
    summary: string;
    keyPoints: string[];
    tags: string[];
  } {
    // 简化解析：从文本中提取关键点
    const summary = text.replace(/【.*?】/g, '').trim();
    const keyPoints = summary
      .split('。')
      .slice(0, 3)
      .filter((s) => s.trim());
    const tags = ['校友', '成就', '互动'];

    return { summary, keyPoints, tags };
  }
}

export const aiSummaryService = new AIGenerateSummaryService();

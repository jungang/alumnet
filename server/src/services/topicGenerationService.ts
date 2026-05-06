/**
 * 智能话题生成服务
 * 基于校友档案和RAG内容，自动生成 Discussion Topics
 */

import { pool } from '../config/database';
import logger from '../config/logger';

interface Topic {
  id: string;
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  suggestedStartTime: number; // minutes from now
  suggestedDuration: number; // minutes
}

interface GenerationContext {
  alumniCount: number;
  topIndustries: string[];
  recentClasses: number[];
  popularKeywords: string[];
}

class TopicGenerationService {
  /**
   * 生成热门话题（按类别）
   */
  async generateTopics(category?: string, limit: number = 10): Promise<Topic[]> {
    const topics: Topic[] = [];

    // 获取上下文
    const context = await this.getContext();

    // 生成不同类别的话题
    const categoryTopics = this.generateCategoryTopics(context, category);
    topics.push(...categoryTopics);

    return topics.slice(0, limit);
  }

  /**
   * 为特定校友生成个性化话题
   */
  async generatePersonalizedTopics(alumniId: string): Promise<Topic[]> {
    const topics: Topic[] = [];

    // 获取校友基本信息
    const alumni = await pool.query(
      `SELECT name, graduation_year, class_name, industry, 
              work_unit, current_city
       FROM alumni_system.alumni WHERE id = $1`,
      [alumniId]
    );

    if (!alumni.rows[0]) return [];

    const { name, graduation_year, class_name, industry, work_unit, current_city } = alumni.rows[0];

    // 基于行业生成话题
    if (industry) {
      topics.push({
        id: `topic-${Date.now()}-${industry}`,
        title: `${industry}行业发展趋势与校友机会`,
        category: 'career',
        difficulty: 'medium',
        tags: ['行业', '就业', '趋势'],
        suggestedStartTime: 0,
        suggestedDuration: 30,
      });
    }

    // 基于班级生成话题
    if (class_name) {
      topics.push({
        id: `topic-${Date.now()}-${class_name}`,
        title: `${graduation_year}届同学聚会安排`,
        category: 'class',
        difficulty: 'easy',
        tags: ['聚会', '班级', '校友'],
        suggestedStartTime: 7 * 24 * 60, // 7天后
        suggestedDuration: 120,
      });
    }

    // 基于城市生成话题
    if (current_city) {
      topics.push({
        id: `topic-${Date.now()}-${current_city}`,
        title: `${current_city}校友见面会`,
        category: 'local',
        difficulty: 'easy',
        tags: ['同城', '见面', '校友'],
        suggestedStartTime: 14 * 24 * 60, // 14天后
        suggestedDuration: 90,
      });
    }

    return topics;
  }

  /**
   * 按类别生成话题
   */
  private generateCategoryTopics(context: GenerationContext, category?: string): Topic[] {
    const topics: Topic[] = [];

    //Career topics
    if (!category || category === 'career') {
      if (context.topIndustries.length > 0) {
        topics.push({
          id: `topic-career-${Date.now()}`,
          title: `${context.topIndustries[0]}行业校友职业发展分享`,
          category: 'career',
          difficulty: 'medium',
          tags: ['职业', '发展', '行业'],
          suggestedStartTime: 0,
          suggestedDuration: 60,
        });
      }
      topics.push({
        id: `topic-career-latest-${Date.now()}`,
        title: '最新就业市场趋势与校友 insights',
        category: 'career',
        difficulty: 'medium',
        tags: ['就业', '趋势', '市场'],
        suggestedStartTime: 0,
        suggestedDuration: 45,
      });
    }

    // Class reunion topics
    if (!category || category === 'class') {
      if (context.recentClasses.length > 0) {
        topics.push({
          id: `topic-reunion-${context.recentClasses[0]}`,
          title: `${context.recentClasses[0]}届校友毕业20周年纪念`,
          category: 'class',
          difficulty: 'easy',
          tags: ['聚会', '纪念', '班级'],
          suggestedStartTime: 30 * 24 * 60, // 30天后
          suggestedDuration: 180,
        });
      }
      topics.push({
        id: `topic-class-connect-${Date.now()}`,
        title: '寻找失联的同班同学',
        category: 'class',
        difficulty: 'easy',
        tags: ['寻人', '同班', '联系'],
        suggestedStartTime: 0,
        suggestedDuration: 30,
      });
    }

    // Campus topics
    if (!category || category === 'campus') {
      topics.push({
        id: `topic-campus-${Date.now()}`,
        title: '母校建设与发展建议',
        category: 'campus',
        difficulty: 'medium',
        tags: ['母校', '建设', '建议'],
        suggestedStartTime: 7 * 24 * 60,
        suggestedDuration: 60,
      });
    }

    // donation topics
    if (!category || category === 'donation') {
      if (context.popularKeywords.length > 0) {
        topics.push({
          id: `topic-donation-${Date.now()}`,
          title: `${context.popularKeywords[0]}校友捐赠项目进展`,
          category: 'donation',
          difficulty: 'easy',
          tags: ['捐赠', '项目', '进展'],
          suggestedStartTime: 0,
          suggestedDuration: 30,
        });
      }
    }

    return topics;
  }

  /**
   * 获取生成话题所需的上下文
   */
  private async getContext(): Promise<GenerationContext> {
    const [alumniCount, topIndustries, recentClasses, popularKeywords] = await Promise.all([
      pool.query('SELECT COUNT(*) as cnt FROM alumni_system.alumni'),
      pool.query(`SELECT industry, COUNT(*) as cnt 
                  FROM alumni_system.alumni 
                  WHERE industry IS NOT NULL AND industry != ''
                  GROUP BY industry 
                  ORDER BY cnt DESC 
                  LIMIT 3`),
      pool.query(`SELECT DISTINCT graduation_year 
                  FROM alumni_system.alumni 
                  ORDER BY graduation_year DESC 
                  LIMIT 3`),
      pool.query(`SELECT keywords, COUNT(*) as cnt 
                  FROM alumni_system.search_logs 
                  GROUP BY keywords 
                  ORDER BY cnt DESC 
                  LIMIT 5`),
    ]);

    return {
      alumniCount: alumniCount.rows[0].cnt,
      topIndustries: topIndustries.rows.map((r) => r.industry),
      recentClasses: recentClasses.rows.map((r) => r.graduation_year),
      popularKeywords: popularKeywords.rows.map((r) => r.keywords),
    };
  }
}

export const topicGenerationService = new TopicGenerationService();

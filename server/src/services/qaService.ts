/**
 * AI 问答助手服务
 * 核心：校友上下文 + RAG 的智能问答系统
 *
 * 流程：
 * 1. Query Analysis → 提取实体 (校友/年份/行业/事件)
 * 2. Context Augmentation → 补充校友上下文
 * 3. RAG Retrieval → 检索相关校友/知识
 * 4. Prompt Construction → 构造 Prompt
 * 5. LLM Response → 调用 AI 生成回答
 * 6. Post-Processing → 格式化/脱敏/引用
 */

import { pool } from '../config/database';
import { ragService } from './ragService';
import logger from '../config/logger';

interface QueryAnalysisResult {
  keywords: string[];
  entity: {
    person?: string;
    year?: number;
    industry?: string;
    position?: string;
  };
  intent: 'find' | 'ask' | 'search' | 'general';
}

interface AnswerContext {
  relatedAlumni: any[];
  knowledgeBase: any[];
  contextSummary: string;
}

class QAService {
  async analyzeQuery(query: string): Promise<QueryAnalysisResult> {
    const result: QueryAnalysisResult = {
      keywords: [],
      entity: {},
      intent: 'general',
    };

    const lowerQuery = query.toLowerCase();

    const keywords = query
      .split(/[\s,，。\.、]/)
      .filter((w) => w.length >= 2)
      .slice(0, 10);
    result.keywords = keywords;

    if (query.includes('谁') || query.includes('哪位')) {
      result.intent = 'find';
    } else if (query.includes('介绍') || query.includes('擅长') || query.includes('成就')) {
      result.intent = 'ask';
    } else if (query.includes('搜索') || query.includes('查找') || query.includes('有没有')) {
      result.intent = 'search';
    } else {
      result.intent = 'general';
    }

    const yearMatch = query.match(/(19|20)\d{2}年?/);
    if (yearMatch) {
      result.entity.year = parseInt(yearMatch[0]);
    }

    const industries = [
      '科技',
      '互联网',
      '金融',
      '教育',
      '医疗',
      '法律',
      '艺术',
      '制造',
      '创业',
      '咨询',
    ];
    for (const ind of industries) {
      if (query.includes(ind)) {
        result.entity.industry = ind;
        break;
      }
    }

    const nameMatch = query.match(
      /([张王李赵刘陈杨黄周吴徐孙马朱胡郭何高林罗郑梁宋谢唐韩曹许邓萧冯曾程蔡彭潘袁于董余苏叶吕魏蒋田杜丁沈姜崔潘陆汪廉温何卢段 Rus])\1?/
    );
    if (nameMatch && nameMatch[0].length <= 3) {
      result.entity.person = nameMatch[0];
    }

    const positions = [
      ' CEO ',
      ' CTO ',
      '创始人 ',
      'CEO ',
      'CTO ',
      '董事长 ',
      '总裁 ',
      '董事 ',
      '总监 ',
      '经理 ',
      '工程师 ',
      '教授 ',
      '医生 ',
      '律师 ',
    ];
    for (const pos of positions) {
      if (query.includes(pos)) {
        result.entity.position = pos.trim();
        break;
      }
    }

    logger.info({ query, intent: result.intent, entity: result.entity }, 'Query analyzed');
    return result;
  }

  async enrichContext(query: string, analysis: QueryAnalysisResult): Promise<AnswerContext> {
    const context: AnswerContext = {
      relatedAlumni: [],
      knowledgeBase: [],
      contextSummary: '',
    };

    if (analysis.intent === 'find' || analysis.intent === 'search') {
      if (analysis.entity.person) {
        const alumni = await pool.query(
          `SELECT id, name, student_id, graduation_year, class_name, industry, 
                   work_unit, current_city, extra_info 
           FROM alumni_system.alumni 
           WHERE name ILIKE $1
           LIMIT 10`,
          [`%${analysis.entity.person}%`]
        );
        context.relatedAlumni = alumni.rows;
      }
    } else if (analysis.intent === 'ask') {
      if (analysis.entity.industry) {
        const alumni = await pool.query(
          `SELECT id, name, graduation_year, work_unit, current_city, extra_info 
           FROM alumni_system.alumni 
           WHERE industry ILIKE $1
           LIMIT 10`,
          [`%${analysis.entity.industry}%`]
        );
        context.relatedAlumni = alumni.rows;
      }
    } else {
      const ragResult = await ragService.query(query);
      context.relatedAlumni = ragResult.relatedAlumni || [];
    }

    const alumniCount = context.relatedAlumni.length;
    const knowledgeCount = context.knowledgeBase.length;
    context.contextSummary = `找到 ${alumniCount} 位相关校友，${knowledgeCount} 条相关知识`;

    return context;
  }

  async generateResponse(
    query: string,
    analysis: QueryAnalysisResult,
    context: AnswerContext
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(query, analysis, context);

    try {
      const response = await this.callLLM(systemPrompt, userPrompt);
      return this.postProcessResponse(response);
    } catch (error) {
      logger.error({ err: error }, 'LLM call failed');
      return '抱歉，AI 服务暂时不可用，请稍后重试。';
    }
  }

  private buildSystemPrompt(): string {
    const systemText = [
      '你是一名专业的校友平台 AI 助手，专门帮助用户查询和了解育文中学校友的信息。',
      '',
      '角色设定：',
      '- 专业、友好、准确',
      '- 引用信息来源',
      '- 保护隐私（不泄露敏感信息）',
      '',
      '可用信息来源：',
      '1. 校友档案（姓名、毕业年份、班级、行业、工作单位、城市）',
      '2. RAG 知识库（校友新闻、捐赠、活动）',
      '',
      '输出要求：',
      '- 先回答问题，再列出相关校友',
      '- 使用 Markdown 格式',
      '- 使用较为简洁的语言',
    ].join('\n');

    return systemText;
  }

  private buildUserPrompt(
    query: string,
    analysis: QueryAnalysisResult,
    context: AnswerContext
  ): string {
    const alumniList = context.relatedAlumni
      .map(
        (alum) =>
          `- ${alum.name} (${alum.graduation_year}届) | ${alum.industry || '未知'} | ${alum.work_unit || '未知'}\n` +
          `  城市: ${alum.current_city}`
      )
      .join('\n');

    const contextInfo = [
      '【相关校友】',
      alumniList || '- 暂无相关校友',
      '',
      '【校友检索提示】',
      '- 你可以根据校友的姓名、毕业年份、行业、职位等进行搜索',
      '- 也可以查询特定主题下的校友（如"科技行业的校友"）',
    ].join('\n');

    const personInfo = analysis.entity.person ? `\n用户可能在寻找：${analysis.entity.person}` : '';

    return `${query}${personInfo}\n\n${contextInfo}`;
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    // 调用外部 AI 服务（待集成）
    // 这里使用 mock 实现
    const preview = userPrompt.substring(0, Math.min(30, userPrompt.length));
    return `根据你的查询"${preview}..."，我为你找到了以下信息：\n\n【相关校友】\n- 已检索到相关校友信息，请在平台中查看详细档案\n\n【提示】\n- 你可以通过姓名、毕业年份、行业等条件筛选校友\n- 详请访问：/alumni/search`;
  }

  private postProcessResponse(response: string): string {
    return response.replace(/\d{11}/g, '***');
  }
}

export const qaService = new QAService();

/**
 * 个性化问答模板服务
 * 根据用户角色/场景，提供定制化的问答 Prompt 模板
 */

import logger from '../config/logger';

interface QATemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  exampleQuestions: string[];
  role: string;
}

class QATemplateService {
  private templates: Map<string, QATemplate> = new Map();

  constructor() {
    this.initTemplates();
  }

  private initTemplates(): void {
    // 校友自助查询模板
    this.templates.set('alumni-self-service', {
      id: 'alumni-self-service',
      name: '校友自助查询',
      description: '校友查询自己的档案信息和同学关系',
      systemPrompt: [
        '你是育文中学的校友自助助手。',
        '你的职责是帮助校友查询自己的档案信息、联系同学、了解校友活动。',
        '语气：亲切、怀旧、热情。',
        '注意：保护隐私，不主动泄露手机号、邮箱等敏感信息。',
        '输出：简洁明了，优先展示关键信息。',
      ].join('\n'),
      exampleQuestions: [
        '我是哪一届的？',
        '帮我找同班同学',
        '最近有什么活动？',
        '我想更新我的工作信息',
      ],
      role: 'verified_alumni',
    });

    // 管理员查询模板
    this.templates.set('admin-query', {
      id: 'admin-query',
      name: '管理员查询',
      description: '管理员查询校友数据和统计数据',
      systemPrompt: [
        '你是育文中学校友平台的管理助手。',
        '你的职责是帮助管理员查询校友数据、生成报表、管理知识库。',
        '语气：专业、准确、简洁。',
        '注意：提供数据时附带来源和时间范围。',
        '输出：结构化格式，优先展示关键指标。',
      ].join('\n'),
      exampleQuestions: [
        '最近一个月新增了多少校友？',
        '哪些行业校友最多？',
        '捐赠总额是多少？',
        '知识库有多少条数据？',
      ],
      role: 'admin',
    });

    // 访客浏览模板
    this.templates.set('guest-browse', {
      id: 'guest-browse',
      name: '访客浏览',
      description: '访客了解学校和校友概况',
      systemPrompt: [
        '你是育文中学的校友平台导览助手。',
        '你的职责是帮助访客了解学校历史、杰出校友、校友活动。',
        '语气：正式、有吸引力、信息丰富。',
        '注意：只展示公开信息，不涉及隐私数据。',
        '输出：生动有趣，适合初次了解学校的人。',
      ].join(['', ''].join()),
      exampleQuestions: [
        '育文中学有什么历史？',
        '有哪些杰出校友？',
        '校友平台有哪些功能？',
        '怎么加入校友会？',
      ],
      role: 'guest',
    });

    // 招聘匹配模板
    this.templates.set('job-matching', {
      id: 'job-matching',
      name: '招聘匹配',
      description: '校友企业招聘与求职匹配',
      systemPrompt: [
        '你是育文中学校友招聘助手。',
        '你的职责是帮助校友企业找到合适的校友候选人，也帮助求职校友匹配岗位。',
        '语气：专业、高效、互利共赢。',
        '注意：保护双方隐私，只展示脱敏信息。',
        '输出：匹配结果 + 推荐理由 + 联系建议。',
      ].join('\n'),
      exampleQuestions: [
        '我们公司想招一位技术总监，有合适的校友吗？',
        '我是2020届毕业的，有哪些校友企业在招人？',
        '帮我匹配5位互联网行业的校友',
      ],
      role: 'verified_alumni',
    });
  }

  /**
   * 获取模板
   */
  getTemplate(templateId: string): QATemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * 根据用户角色推荐模板
   */
  getTemplateByRole(role: string): QATemplate | undefined {
    const roleMap: Record<string, string> = {
      super_admin: 'admin-query',
      admin: 'admin-query',
      verified_alumni: 'alumni-self-service',
      guest: 'guest-browse',
    };

    const templateId = roleMap[role] || 'guest-browse';
    return this.templates.get(templateId);
  }

  /**
   * 列出所有模板
   */
  listTemplates(): QATemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 根据模板构建完整 Prompt
   */
  buildPrompt(templateId: string, userQuery: string): string {
    const template = this.templates.get(templateId);
    if (!template) {
      logger.warn({ templateId }, '模板不存在，使用默认');
      return userQuery;
    }

    return `${template.systemPrompt}\n\n用户问题：${userQuery}`;
  }
}

export const qaTemplateService = new QATemplateService();

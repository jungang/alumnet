/**
 * 多轮对话上下文管理服务
 *
 * Phase 5.5: 支持 sessionId 维度的会话跟踪，构建包含历史消息的 AI Prompt。
 * - conversationStore: Map-based 内存存储（按 sessionId 索引）
 * - 24h TTL 自动过期
 * - 可配置上下文窗口大小
 */

import logger from '../config/logger';
import { ragService } from './ragService';

// ========== 类型定义 ==========

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ConversationSession {
  messages: ConversationMessage[];
  createdAt: number;
  lastActiveAt: number;
}

// ========== 配置 ==========

/** 上下文窗口：传给 AI 的最近 N 条消息（不含 system） */
const DEFAULT_CONTEXT_LIMIT = parseInt(process.env.CONVERSATION_CONTEXT_LIMIT || '10', 10);

/** 会话 TTL（毫秒），默认 24 小时 */
const SESSION_TTL_MS = parseInt(process.env.CONVERSATION_TTL_MS || String(24 * 60 * 60 * 1000), 10);

/** 单条消息最大长度（字符） */
const MAX_MESSAGE_LENGTH = parseInt(process.env.CONVERSATION_MAX_MESSAGE_LENGTH || '2000', 10);

/** 每个会话最大消息条数（防止内存膨胀） */
const MAX_MESSAGES_PER_SESSION = parseInt(
  process.env.CONVERSATION_MAX_MESSAGES_PER_SESSION || '200',
  10
);

/** 清理间隔（毫秒），默认 10 分钟 */
const CLEANUP_INTERVAL_MS = parseInt(
  process.env.CONVERSATION_CLEANUP_INTERVAL_MS || String(10 * 60 * 1000),
  10
);

// ========== 服务实现 ==========

class ConversationService {
  private store: Map<string, ConversationSession> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  // ---------- 公共 API ----------

  /**
   * 添加一条消息到指定会话
   */
  addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): void {
    this.ensureSession(sessionId);

    const session = this.store.get(sessionId)!;

    // 截断超长消息
    const truncated =
      content.length > MAX_MESSAGE_LENGTH ? content.slice(0, MAX_MESSAGE_LENGTH) + '…' : content;

    session.messages.push({
      role,
      content: truncated,
      timestamp: Date.now(),
    });
    session.lastActiveAt = Date.now();

    // 超过上限时丢弃最旧的（保留 system 消息）
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      session.messages = this.trimMessages(session.messages, MAX_MESSAGES_PER_SESSION);
    }

    logger.debug({ sessionId, role, msgLen: truncated.length }, 'conversation: message added');
  }

  /**
   * 获取指定会话最近的 N 条消息（不含 system）
   * @param limit 默认 DEFAULT_CONTEXT_LIMIT
   */
  getContext(sessionId: string, limit: number = DEFAULT_CONTEXT_LIMIT): ConversationMessage[] {
    const session = this.store.get(sessionId);
    if (!session) return [];

    // 过滤掉 system 消息，只取最近 limit 条 user/assistant
    const nonSystem = session.messages.filter((m) => m.role !== 'system');
    return nonSystem.slice(-limit);
  }

  /**
   * 获取完整的对话历史（包含 system 消息）
   */
  getHistory(sessionId: string): ConversationMessage[] {
    const session = this.store.get(sessionId);
    if (!session) return [];
    return [...session.messages];
  }

  /**
   * 清除指定会话的对话历史
   */
  clearContext(sessionId: string): boolean {
    const deleted = this.store.delete(sessionId);
    if (deleted) {
      logger.info({ sessionId }, 'conversation: context cleared');
    }
    return deleted;
  }

  /**
   * 构建包含历史上下文的 AI Prompt
   *
   * 返回可直接传给 RAGService.chat() 的多轮消息数组：
   *  - system prompt（来自 RAGService）
   *  - 最近 N 轮 user/assistant 消息
   *  - 新的 user query
   */
  async buildConversationPrompt(
    sessionId: string,
    newQuery: string,
    contextLimit: number = DEFAULT_CONTEXT_LIMIT
  ): Promise<Array<{ role: 'system' | 'user' | 'assistant'; content: string }>> {
    // 1. 获取 system prompt（复用 RAGService 的配置）
    const systemPrompt = await this.getSystemPrompt();

    // 2. 获取历史上下文
    const history = this.getContext(sessionId, contextLimit);

    // 3. 组装消息列表
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of history) {
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    // 4. 追加当前用户查询
    messages.push({ role: 'user', content: newQuery });

    return messages;
  }

  /**
   * 发送消息并获取 AI 回复（核心方法）
   *
   * 流程：
   * 1. 记录用户消息
   * 2. 构建带上下文的 prompt
   * 3. 调用 RAG 服务获取 AI 回复
   * 4. 记录 AI 回复
   * 5. 返回回复
   */
  async sendMessage(
    sessionId: string,
    userMessage: string,
    contextLimit: number = DEFAULT_CONTEXT_LIMIT
  ): Promise<{ answer: string; relatedAlumni: any[]; messageCount: number }> {
    // 1. 记录用户消息
    this.addMessage(sessionId, 'user', userMessage);

    // 2. 构建 prompt
    const messages = await this.buildConversationPrompt(sessionId, userMessage, contextLimit);

    // 3. 调用 AI — 使用 RAG 查询（含向量检索 + 关键词检索）
    const ragResult = await ragService.query(userMessage);

    // 4. 记录 AI 回复
    this.addMessage(sessionId, 'assistant', ragResult.answer);

    // 5. 返回
    const session = this.store.get(sessionId);
    const messageCount = session ? session.messages.filter((m) => m.role !== 'system').length : 0;

    return {
      answer: ragResult.answer,
      relatedAlumni: ragResult.relatedAlumni,
      messageCount,
    };
  }

  /**
   * 获取会话统计信息
   */
  getSessionStats(sessionId: string): {
    exists: boolean;
    messageCount: number;
    createdAt: number | null;
    lastActiveAt: number | null;
  } {
    const session = this.store.get(sessionId);
    if (!session) {
      return { exists: false, messageCount: 0, createdAt: null, lastActiveAt: null };
    }
    return {
      exists: true,
      messageCount: session.messages.filter((m) => m.role !== 'system').length,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
    };
  }

  /**
   * 获取所有活跃会话数（监控用途）
   */
  getActiveSessionCount(): number {
    return this.store.size;
  }

  // ---------- 内部方法 ----------

  /**
   * 确保会话存在
   */
  private ensureSession(sessionId: string): void {
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, {
        messages: [],
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
      });
      logger.info({ sessionId }, 'conversation: new session created');
    }
  }

  /**
   * 裁剪消息列表到指定上限（优先保留 system 消息 + 最新消息）
   */
  private trimMessages(messages: ConversationMessage[], maxCount: number): ConversationMessage[] {
    // 先分离 system 和非 system
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system');

    // 保留最新的非 system 消息
    const kept = nonSystemMsgs.slice(-(maxCount - systemMsgs.length));

    return [...systemMsgs, ...kept];
  }

  /**
   * 获取 system prompt（委托给 RAGService 的 getSystemPrompt 逻辑）
   * RAGService 的 getSystemPrompt 是 private 的，所以这里重新读取配置。
   * 也可以考虑后续将 getSystemPrompt 提取为公共方法。
   */
  private async getSystemPrompt(): Promise<string> {
    // 复用 RAG 服务：发送一条 query 触发缓存，但这里直接构建
    // 为了避免循环依赖和重复代码，用与 RAGService 相同的默认 prompt
    const schoolName = process.env.SCHOOL_NAME || '示例中学';
    const schoolSince = process.env.SCHOOL_SINCE || '1917';
    const schoolMotto = process.env.SCHOOL_MOTTO || '德才兼备';

    return `你是${schoolName}校史馆的智能助手"校园小助手"。

【学校背景】
${schoolName}创建于${schoolSince}年，是一所具有百年历史的名校。学校秉承"${schoolMotto}"的校训。

【对话要求】
1. 结合对话上下文理解用户意图
2. 优先使用校史馆知识库中的资料回答
3. 如果知识库资料不足，可以结合通用知识补充，但要区分来源
4. 对于具体校友查询，建议用户使用搜索功能
5. 保持友好、专业、简洁的语气
6. 回答控制在300字以内
7. 如果用户的问题依赖前文上下文，请综合理解后作答`;
  }

  /**
   * 定期清理过期会话
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;

      for (const [sessionId, session] of this.store) {
        if (now - session.lastActiveAt > SESSION_TTL_MS) {
          this.store.delete(sessionId);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        logger.info(
          { expiredCount, activeCount: this.store.size },
          'conversation: expired sessions cleaned'
        );
      }
    }, CLEANUP_INTERVAL_MS);

    // 防止定时器阻止进程退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * 停止清理定时器（测试 / 关闭时调用）
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// 单例导出
export const conversationService = new ConversationService();

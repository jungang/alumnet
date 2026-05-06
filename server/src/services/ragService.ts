import { QdrantClient } from '@qdrant/js-client-rest';
import { pool } from '../config/database';
import { Alumni } from '../types/models';
import { llmService, estimateTokens } from './llmService';
import { llmConfig } from '../config/llm';
import logger from '../config/logger';

interface RAGResponse {
  answer: string;
  relatedAlumni: Alumni[];
  degraded?: boolean; // 降级标记
}

interface CachedAnswer {
  response: RAGResponse;
  timestamp: number;
}

// ========== 熔断器 ==========

type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxAttempts: number;
  private halfOpenAttempts = 0;

  constructor(failureThreshold = 5, resetTimeoutMs = 60000, halfOpenMaxAttempts = 2) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.halfOpenMaxAttempts = halfOpenMaxAttempts;
  }

  get currentState(): CircuitState {
    return this.state;
  }

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      // 检查是否到了半开窗口
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        logger.warn('Circuit breaker: OPEN → HALF-OPEN，尝试恢复');
        return true;
      }
      return false;
    }
    // half-open: 限制尝试次数
    if (this.halfOpenAttempts < this.halfOpenMaxAttempts) {
      this.halfOpenAttempts++;
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failureCount = 0;
      logger.info('Circuit breaker: HALF-OPEN → CLOSED，服务恢复');
    }
    this.failureCount = 0;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'half-open') {
      this.state = 'open';
      logger.warn('Circuit breaker: HALF-OPEN → OPEN，恢复失败');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
      logger.error({ failureCount: this.failureCount }, 'Circuit breaker: CLOSED → OPEN，熔断触发');
    }
  }
}

// AI配置 — Chat 部分已迁移至 config/llm.ts，由 llmService 统一管理
// Embedding 仍使用以下环境变量 (Embedding 不走 llmService 通用路径)
const GLM_API_KEY = process.env.GLM_API_KEY;

// Embedding配置
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'glm';
const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'embedding-2';

// Qdrant配置
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'alumni_knowledge';
const VECTOR_SIZE = EMBEDDING_PROVIDER === 'bge' ? 1024 : 1024; // BGE-M3 和 GLM embedding-2 都是1024维

// ---- Token 预算控制 ----
const DAILY_TOKEN_LIMIT = parseInt(process.env.RAG_DAILY_TOKEN_LIMIT || '100000');
const MONTHLY_TOKEN_LIMIT = parseInt(process.env.RAG_MONTHLY_TOKEN_LIMIT || '3000000');
const SIMPLE_QUERY_MAX_LENGTH = parseInt(process.env.RAG_SIMPLE_QUERY_MAX_LENGTH || '20');

class TokenBudget {
  private dailyUsage = 0;
  private monthlyUsage = 0;
  private dailyResetDate = new Date().toISOString().slice(0, 10);
  private monthlyResetMonth = new Date().toISOString().slice(0, 7);

  /** 记录一次消耗并返回是否在预算内 */
  record(tokens: number): boolean {
    this.checkReset();
    this.dailyUsage += tokens;
    this.monthlyUsage += tokens;

    if (this.dailyUsage >= DAILY_TOKEN_LIMIT * 0.9 && this.dailyUsage < DAILY_TOKEN_LIMIT) {
      logger.warn(
        { dailyUsage: this.dailyUsage, limit: DAILY_TOKEN_LIMIT },
        'RAG token 日预算接近上限 (90%)'
      );
    }
    if (this.dailyUsage >= DAILY_TOKEN_LIMIT) {
      logger.error(
        { dailyUsage: this.dailyUsage, limit: DAILY_TOKEN_LIMIT },
        'RAG token 日预算已耗尽'
      );
      return false;
    }
    return true;
  }

  /** 判断查询是否足够简单，可跳过完整 RAG 流程 */
  isSimpleQuery(query: string): boolean {
    if (query.length > SIMPLE_QUERY_MAX_LENGTH) return false;
    if (query.includes('怎么样') || query.includes('为什么') || query.includes('如何'))
      return false;
    return true;
  }

  private checkReset() {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);
    if (today !== this.dailyResetDate) {
      this.dailyUsage = 0;
      this.dailyResetDate = today;
    }
    if (thisMonth !== this.monthlyResetMonth) {
      this.monthlyUsage = 0;
      this.monthlyResetMonth = thisMonth;
    }
  }

  getUsage() {
    this.checkReset();
    return {
      daily: { used: this.dailyUsage, limit: DAILY_TOKEN_LIMIT },
      monthly: { used: this.monthlyUsage, limit: MONTHLY_TOKEN_LIMIT },
    };
  }
}

const tokenBudget = new TokenBudget();

// RAG 安全配置
const RAG_MAX_INPUT_LENGTH = parseInt(process.env.RAG_MAX_INPUT_LENGTH || '500', 10);
const RAG_QUERY_TIMEOUT_MS = parseInt(process.env.RAG_QUERY_TIMEOUT_MS || '30000', 10);
const CACHE_TTL = 1000 * 60 * 60; // 1小时缓存

// 常见问题预热列表
const WARMUP_QUERIES = (process.env.RAG_WARMUP_QUERIES || '').split(',').filter(Boolean);
// 默认预热查询
const DEFAULT_WARMUP_QUERIES = [
  '学校有多少校友',
  '最著名的校友是谁',
  '校友分布在哪些行业',
  '有哪些杰出的企业家校友',
];

// Prompt Injection 检测模式（扩充至 10+ 种）
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /you\s+are\s+now/i,
  /new\s+instructions?\s*:/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /forget\s+(all\s+)?previous/i,
  /disregard\s+(all\s+)?previous/i,
  /override\s+(your\s+)?(instructions|rules|guidelines)/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+if/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /\[system\]/i,
  /<\/?system>/i,
];

// 学校配置（从环境变量读取，支持多校部署）
const SCHOOL_NAME = process.env.SCHOOL_NAME || '示例中学';
const SCHOOL_SINCE = process.env.SCHOOL_SINCE || '1917';
const SCHOOL_MOTTO = process.env.SCHOOL_MOTTO || '德才兼备';

export class RAGService {
  private cache: Map<string, CachedAnswer> = new Map();
  private qdrant: QdrantClient;
  private collectionReady = false;
  private systemPromptCache: string | null = null;
  private systemPromptCacheTime: number = 0;
  private readonly SYSTEM_PROMPT_TTL = 5 * 60 * 1000; // 5分钟刷新一次
  private circuitBreaker = new CircuitBreaker(
    parseInt(process.env.RAG_CB_FAILURE_THRESHOLD || '5', 10),
    parseInt(process.env.RAG_CB_RESET_TIMEOUT_MS || '60000', 10),
    parseInt(process.env.RAG_CB_HALF_OPEN_ATTEMPTS || '2', 10)
  );

  constructor() {
    this.qdrant = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });
    this.initCollection();
    this.warmupCache();
  }

  /** 预热缓存：异步填充常见问题的答案 */
  private async warmupCache() {
    const queries = WARMUP_QUERIES.length > 0 ? WARMUP_QUERIES : DEFAULT_WARMUP_QUERIES;
    // 延迟 30 秒预热，等待 Qdrant 初始化
    setTimeout(async () => {
      for (const q of queries) {
        try {
          // 只在缓存中不存在时预热
          const cacheKey = this.hashQuery(q);
          if (!this.cache.has(cacheKey)) {
            logger.info({ query: q }, '预热缓存查询');
            await this.query(q);
          }
        } catch {
          // 预热失败不影响服务
        }
      }
    }, 30000);
  }

  // 初始化Qdrant集合
  private async initCollection() {
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === QDRANT_COLLECTION);

      if (!exists) {
        await this.qdrant.createCollection(QDRANT_COLLECTION, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        logger.info(`✅ Qdrant集合 ${QDRANT_COLLECTION} 创建成功`);
      }
      this.collectionReady = true;
      logger.info(`✅ Qdrant连接成功，集合: ${QDRANT_COLLECTION}`);
    } catch (error) {
      logger.warn({ err: error }, 'Qdrant初始化失败，将使用降级模式');
    }
  }

  /**
   * 输入清洗和校验
   * - 长度限制
   * - 控制字符移除
   * - Prompt injection 检测
   */
  private sanitizeInput(query: string): { sanitized: string; isSuspicious: boolean } {
    // 移除控制字符
    let sanitized = query.replace(/[\x00-\x1f\x7f]/g, '').trim();

    // 长度限制
    if (sanitized.length > RAG_MAX_INPUT_LENGTH) {
      sanitized = sanitized.slice(0, RAG_MAX_INPUT_LENGTH);
    }

    // 最小长度
    if (sanitized.length < 2) {
      return { sanitized: '', isSuspicious: false };
    }

    // Prompt injection 检测
    let isSuspicious = false;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        isSuspicious = true;
        sanitized = sanitized.replace(pattern, '[已过滤]');
      }
    }

    return { sanitized, isSuspicious };
  }

  /**
   * 转义 SQL LIKE/ILIKE 通配符
   * 防止用户输入 % 或 _ 导致全表扫描或信息泄露
   */
  private escapeLikeWildcards(input: string): string {
    return input
      .replace(/\\/g, '\\\\') // 转义反斜杠
      .replace(/%/g, '\\%') // 转义 %
      .replace(/_/g, '\\_'); // 转义 _
  }

  /**
   * 动态构建 System Prompt（从环境变量 + system_config 表读取）
   * 支持多校部署，无需改代码即可定制 AI 人设
   */
  private async getSystemPrompt(): Promise<string> {
    // 缓存机制：5分钟内不重复查询数据库
    if (
      this.systemPromptCache &&
      Date.now() - this.systemPromptCacheTime < this.SYSTEM_PROMPT_TTL
    ) {
      return this.systemPromptCache;
    }

    // 从数据库读取自定义配置（如果有的话）
    let schoolName = SCHOOL_NAME;
    let schoolSince = SCHOOL_SINCE;
    let schoolMotto = SCHOOL_MOTTO;
    let customPrompt = '';

    try {
      await pool.query('SET search_path TO alumni_system, public');
      const configResult = await pool.query(
        `SELECT config_key, config_value FROM system_config 
         WHERE config_key IN ('school_name', 'school_since', 'school_motto', 'rag_system_prompt')`
      );

      for (const row of configResult.rows) {
        switch (row.config_key) {
          case 'school_name':
            schoolName = row.config_value || schoolName;
            break;
          case 'school_since':
            schoolSince = row.config_value || schoolSince;
            break;
          case 'school_motto':
            schoolMotto = row.config_value || schoolMotto;
            break;
          case 'rag_system_prompt':
            customPrompt = row.config_value || '';
            break;
        }
      }
    } catch (error) {
      logger.warn({ err: error }, '读取系统配置失败，使用默认值');
    }

    // 如果管理后台配置了自定义 prompt，直接使用
    if (customPrompt) {
      this.systemPromptCache = customPrompt
        .replace('{school_name}', schoolName)
        .replace('{school_since}', schoolSince)
        .replace('{school_motto}', schoolMotto);
      this.systemPromptCacheTime = Date.now();
      return this.systemPromptCache;
    }

    // 默认 prompt（可配置化）
    this.systemPromptCache = `你是${schoolName}校史馆的智能助手"校园小助手"。

【学校背景】
${schoolName}创建于${schoolSince}年，是一所具有百年历史的名校。学校秉承"${schoolMotto}"的校训。

【杰出校友】
学校培养了众多杰出人才，包括：
- 著名科学家（1929年就读）：中科院院士、"两弹一星"功勋科学家
- 著名抗日将领（1923-1925年就读）：东北抗日联军创建人、革命烈士
- 著名地震专家（1947年就读）：中科院院士
- 以及众多在政界、商界、学术界取得卓越成就的校友

【回答原则】
1. 优先使用校史馆知识库中的资料回答
2. 如果知识库资料不足，可以结合通用知识补充，但要区分来源
3. 对于具体校友查询，建议用户使用搜索功能
4. 保持友好、专业、简洁的语气
5. 回答控制在300字以内`;

    this.systemPromptCacheTime = Date.now();
    return this.systemPromptCache;
  }

  // 生成文本向量 (支持多种Embedding服务)
  private async getEmbedding(text: string): Promise<number[]> {
    if (EMBEDDING_PROVIDER === 'bge') {
      return this.getBGEEmbedding(text);
    }
    return this.getGLMEmbedding(text);
  }

  // BGE Embedding (本地服务)
  private async getBGEEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RAG_QUERY_TIMEOUT_MS);

    try {
      const response = await fetch(`${EMBEDDING_BASE_URL}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text.substring(0, 8000),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error({ status: response.status, body: errText }, 'BGE Embedding API错误');
        throw new Error(`BGE Embedding API错误: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } finally {
      clearTimeout(timeout);
    }
  }

  // GLM Embedding (智谱API)
  private async getGLMEmbedding(text: string): Promise<number[]> {
    if (!GLM_API_KEY) {
      throw new Error('GLM API Key未配置');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RAG_QUERY_TIMEOUT_MS);

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'embedding-2',
          input: text.substring(0, 8000),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error({ status: response.status, body: errText }, 'GLM Embedding API错误');
        throw new Error(`GLM Embedding API错误: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } finally {
      clearTimeout(timeout);
    }
  }

  // 生成UUID v4
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // 添加内容到知识库
  async addToKnowledge(content: string, metadata: Record<string, any> = {}): Promise<string> {
    if (!this.collectionReady) {
      logger.warn('Qdrant未就绪，跳过向量化');
      return 'skipped';
    }

    try {
      const embedding = await this.getEmbedding(content);
      const id = this.generateUUID();

      await this.qdrant.upsert(QDRANT_COLLECTION, {
        wait: true,
        points: [
          {
            id,
            vector: embedding,
            payload: {
              content: content.substring(0, 10000),
              ...metadata,
              createdAt: new Date().toISOString(),
            },
          },
        ],
      });

      logger.info(`✅ 内容已添加到知识库: ${metadata.title || id}`);
      return id;
    } catch (error) {
      logger.error({ err: error }, '添加到知识库失败');
      throw error;
    }
  }

  // 向量检索
  async searchKnowledge(query: string, limit = 5): Promise<any[]> {
    if (!this.collectionReady) {
      return [];
    }

    try {
      const queryVector = await this.getEmbedding(query);
      const results = await this.qdrant.search(QDRANT_COLLECTION, {
        vector: queryVector,
        limit,
        with_payload: true,
      });

      return results.map((r) => ({
        score: r.score,
        content: r.payload?.content,
        ...r.payload,
      }));
    } catch (error) {
      logger.warn({ err: error }, '向量检索失败');
      return [];
    }
  }

  /**
   * 关键词检索（支持TF-IDF加权匹配）
   * 在校友数据库中进行关键词搜索，支持字段权重和模糊匹配
   */
  async keywordSearch(
    query: string,
    options: {
      limit?: number;
      fieldWeights?: Record<string, number>;
      addRecencyBias?: boolean;
    } = {}
  ): Promise<{ results: any[]; keywordHits?: number }> {
    const {
      limit = 10,
      fieldWeights = { name: 3.0, biography: 2.0, class_name: 1.5, industry: 1.2, extra_info: 1.0 },
      addRecencyBias = true,
    } = options;

    if (!this.collectionReady) {
      // 如果Qdrant未就绪，降级到最简单的关键词搜索
      return { results: [], keywordHits: 0 };
    }

    try {
      await pool.query('SET search_path TO alumni_system, public');

      // 解析查询关键词（支持多词匹配）
      const cleanQuery = query.replace(/[^\w\u4e00-\u9fa5]/g, ' ').trim();
      const keywords = cleanQuery
        .split(/\s+/)
        .filter((k) => k.length >= 2)
        .map(this.escapeLikeWildcards);

      if (keywords.length === 0) {
        return { results: [], keywordHits: 0 };
      }

      // 构建关键词匹配条件（支持AND和OR模式）
      const keywordConditions = keywords.map((kw, idx) => {
        const orConditions = [
          `name ILIKE $${idx * 5 + 1}`,
          `biography ILIKE $${idx * 5 + 2}`,
          `class_name ILIKE $${idx * 5 + 3}`,
          `industry ILIKE $${idx * 5 + 4}`,
          `extra_info::text ILIKE $${idx * 5 + 5}`,
        ];
        return `(${orConditions.join(' OR ')})`;
      });

      const whereClause =
        keywordConditions.length > 0 ? `WHERE ${keywordConditions.join(' AND ')}` : '';

      // 构建排序字段（基于TF-IDF权重和匹配度）
      const scoreSegments = [
        // 名字匹配权重最高
        `CASE WHEN name ILIKE $1 THEN ${fieldWeights.name} ELSE 0 END`,
        // 介绍匹配
        `CASE WHEN biography ILIKE $1 THEN ${fieldWeights.biography} ELSE 0 END`,
        // 班级匹配
        `CASE WHEN class_name ILIKE $1 THEN ${fieldWeights.class_name} ELSE 0 END`,
        // 行业匹配
        `CASE WHEN industry ILIKE $1 THEN ${fieldWeights.industry} ELSE 0 END`,
        // 额外信息匹配
        `CASE WHEN extra_info::text ILIKE $1 THEN ${fieldWeights.extra_info} ELSE 0 END`,
      ];

      // 多关键词时累加分数
      const multiKeywordScore =
        keywords.length > 1
          ? keywords
              .slice(1)
              .map((kw, idx) => {
                const prefix = idx * 5;
                return [
                  `CASE WHEN name ILIKE $${prefix + 1} THEN ${fieldWeights.name} ELSE 0 END`,
                  `CASE WHEN biography ILIKE $${prefix + 2} THEN ${fieldWeights.biography} ELSE 0 END`,
                  `CASE WHEN class_name ILIKE $${prefix + 3} THEN ${fieldWeights.class_name} ELSE 0 END`,
                  `CASE WHEN industry ILIKE $${prefix + 4} THEN ${fieldWeights.industry} ELSE 0 END`,
                  `CASE WHEN extra_info::text ILIKE $${prefix + 5} THEN ${fieldWeights.extra_info} ELSE 0 END`,
                ].join(' + ');
              })
              .join(' + ')
          : '';

      const scoreExpression =
        keywords.length > 1
          ? `(${scoreSegments.join(' + ')} + ${multiKeywordScore})`
          : `(${scoreSegments.join(' + ')})`;

      // 添加Recency偏差
      const recencyExpression = addRecencyBias
        ? `
          + CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 2 THEN 1.0
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 5 THEN 0.8
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 10 THEN 0.6
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 20 THEN 0.4
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 50 THEN 0.2
            ELSE 0.1
          END`
        : '';

      // 统计匹配数量
      const countQuery = `SELECT COUNT(*) as total FROM alumni ${whereClause}`;
      const countResult = await pool.query(
        countQuery,
        keywords.flatMap((k) => Array(5).fill(`%${k}%`))
      );
      const keywordHits = parseInt(countResult.rows[0].total) || 0;

      // 获取结果（只取前N条）
      const mainQuery = `
        SELECT id, name, graduation_year, class_name, industry, current_city, work_unit, 
               phone, email, phone_visibility, email_visibility, status, extra_info,
               created_at, updated_at,
               ${scoreExpression} as keyword_score
               ${
                 recencyExpression
                   ? `, (${scoreExpression} * (1 + CASE 
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 2 THEN 1.0
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 5 THEN 0.8
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 10 THEN 0.6
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 20 THEN 0.4
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, graduation_year::date)) <= 50 THEN 0.2
            ELSE 0.1
          END)) as hybrid_score`
                   : ''
               }
        FROM alumni 
        ${whereClause}
        ORDER BY keyword_score DESC, graduation_year DESC
        LIMIT $${keywords.length * 5 + 1}
      `;

      const result = await pool.query(mainQuery, [
        ...keywords.flatMap((k) => Array(5).fill(`%${k}%`)),
        limit,
      ]);

      logger.debug({ query, keywordHits, matched: result.rows.length }, '关键词检索完成');

      return {
        results: result.rows,
        keywordHits,
      };
    } catch (error) {
      logger.warn({ err: error, query }, '关键词检索失败');
      return { results: [], keywordHits: 0 };
    }
  }

  // 生成查询哈希
  private hashQuery(query: string): string {
    return Buffer.from(query.toLowerCase().trim()).toString('base64');
  }

  // 检查缓存是否过期
  private isExpired(cached: CachedAnswer): boolean {
    return Date.now() - cached.timestamp > CACHE_TTL;
  }

  // 统一Chat接口 — 委托给 llmService (含重试、故障转移、缓存)
  async chat(prompt: string): Promise<string> {
    const systemPrompt = await this.getSystemPrompt();
    const result = await llmService.callLLM(prompt, {
      systemPrompt,
      metadata: { service: 'ragService' },
    });
    return result.content;
  }

  // 构建RAG提示词
  private buildPrompt(query: string, knowledgeResults: any[], alumni: any[]): string {
    let context = '';
    const hasKnowledge = knowledgeResults.length > 0;
    const hasAlumni = alumni.length > 0;

    if (hasKnowledge) {
      context += '【校史馆知识库资料】\n';
      context += knowledgeResults
        .map((r, i) => `${i + 1}. ${r.content?.substring(0, 800) || ''}`)
        .join('\n\n');
      context += '\n\n';
    }

    if (hasAlumni) {
      context += '【数据库校友信息】\n';
      context += alumni
        .map((a) => `- ${a.name}（${a.graduation_year}届）：${a.biography || '暂无简介'}`)
        .join('\n');
      context += '\n\n';
    }

    // 根据是否有知识库内容，调整回答策略
    let instruction = '';
    if (hasKnowledge || hasAlumni) {
      instruction = `请优先根据以上校史馆资料回答问题。如果资料中有明确信息，请据实回答；如果资料不够详细，可以结合你的通用知识进行适当补充，但要注明哪些是来自校史馆资料，哪些是补充信息。`;
    } else {
      instruction = `校史馆知识库中暂无直接相关的资料。请根据你对${SCHOOL_NAME}的了解（该校创建于${SCHOOL_SINCE}年，是一所百年名校，培养了多位杰出校友）来回答问题。如果问题涉及具体校友信息，建议用户使用搜索功能查询。`;
    }

    return `【用户问题】${query}

${context}【回答要求】
${instruction}
请用友好、专业的语气回答，控制在300字以内。`;
  }

  /**
   * 混合检索（Hybrid Search）- Phase 4.1 新增
   * 结合向量相似度 + 关键词TF-IDF + Recency偏差
   */
  async hybridSearch(
    query: string,
    options: {
      vectorLimit?: number;
      keywordLimit?: number;
      topK?: number;
      vectorWeight?: number;
      keywordWeight?: number;
    } = {}
  ): Promise<{ alumni: any[]; knowledge: any[] }> {
    const {
      vectorLimit = 5,
      keywordLimit = 10,
      topK = 8,
      vectorWeight = 0.6,
      keywordWeight = 0.4,
    } = options;

    // Step 1: 向量搜索
    const vectorResults = await this.searchKnowledge(query, vectorLimit);

    // Step 2: 关键词搜索（带TF-IDF和Recency偏差）
    const keywordResult = await this.keywordSearch(query, {
      limit: keywordLimit,
      addRecencyBias: true,
    });

    const keywordResults = keywordResult.results;

    // Step 3: 标准化分数
    // 向量分数：Cosine相似度范围已归一化，直接使用
    const normalizedVectorScores = this.normalizeScores(
      vectorResults.map((r) => r.score),
      0,
      1
    );

    // 关键词分数：需要根据keyword_score进行标准化
    const keywordScores = keywordResults.map((r: any) => parseFloat(r.keyword_score) || 0);
    const normalizedKeywordScores = this.normalizeScores(keywordScores, 0, 1);

    // Step 4: 计算Hybrid分数
    const allResults = [];

    // 处理向量搜索结果
    for (let i = 0; i < vectorResults.length; i++) {
      const vectorScore = normalizedVectorScores[i];
      const hybridScore = vectorWeight * vectorScore; // 关键词分数默认为0

      allResults.push({
        ...vectorResults[i],
        source: 'vector',
        vector_score: vectorScore,
        keyword_score: 0,
        hybrid_score: hybridScore,
      });
    }

    // 处理关键词搜索结果
    for (let i = 0; i < keywordResults.length; i++) {
      const keywordScore = normalizedKeywordScores[i];
      // 检查是否在向量结果中已存在（去重）
      const existingIdx = allResults.findIndex(
        (r) => r.id === keywordResults[i].id || r.content === keywordResults[i].content
      );

      if (existingIdx >= 0) {
        // 去重：合并分数
        const vectorScore = allResults[existingIdx].vector_score || 0;
        const newHybridScore = vectorWeight * vectorScore + keywordWeight * keywordScore;
        allResults[existingIdx].keyword_score = keywordScore;
        allResults[existingIdx].hybrid_score = newHybridScore;
      } else {
        allResults.push({
          ...keywordResults[i],
          source: 'keyword',
          vector_score: 0,
          keyword_score: keywordScore,
          hybrid_score: keywordWeight * keywordScore,
        });
      }
    }

    // Step 5: 按Hybrid分数排序并截取Top K
    allResults.sort((a, b) => b.hybrid_score - a.hybrid_score);

    const topResults = allResults.slice(0, topK);

    // Step 6: 识别 alumni 和 knowledge 的区分
    const alumni = topResults
      .filter((r) => r.id !== undefined) // alumni 有 id 字段
      .map((r) => ({
        ...r,
        id: r.id,
        name: r.name,
        graduation_year: r.graduation_year,
        class_name: r.class_name,
        industry: r.industry,
        current_city: r.current_city,
        work_unit: r.work_unit,
        phone: r.phone,
        email: r.email,
        phone_visibility: r.phone_visibility,
        email_visibility: r.email_visibility,
        status: r.status,
        extra_info: r.extra_info,
        created_at: r.created_at,
        updated_at: r.updated_at,
        hybrid_score: r.hybrid_score,
      }));

    const knowledge = topResults
      .filter((r) => r.content !== undefined) // knowledge 有 content 字段
      .map((r) => ({
        ...r,
        content: r.content,
        hybrid_score: r.hybrid_score,
      }));

    logger.info(
      {
        query,
        vectorCount: vectorResults.length,
        keywordCount: keywordResult.results.length,
        hybridCount: topResults.length,
        alumniCount: alumni.length,
        knowledgeCount: knowledge.length,
      },
      '混合检索完成'
    );

    return { alumni, knowledge };
  }

  /**
   * 分数标准化（Min-Max normalization）
   */
  private normalizeScores(scores: number[], min: number = 0, max: number = 1): number[] {
    if (scores.length === 0) return [];
    if (scores.length === 1) return [(max - min) / 2]; // 单个分数返回中间值

    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    if (maxScore === minScore) {
      // 所有分数相同，返回中间值
      return scores.map(() => (max - min) / 2);
    }

    return scores.map((score) =>
      Math.max(min, Math.min(max, ((score - minScore) / (maxScore - minScore)) * (max - min) + min))
    );
  }

  /**
   * 基于Recency的重排序（Recency Bias Reranking）
   * 假设校友越近年毕业相关性越高
   */
  private applyRecencyBias(results: any[], decayFactor: number = 0.1): any[] {
    const currentYear = new Date().getFullYear();

    return results.map((result) => {
      let recencyScore = 0;
      const graduationYear = result.graduation_year || result.graduationYear;

      if (graduationYear) {
        const yearDiff = currentYear - parseInt(graduationYear);
        // 指数衰减：越近年毕业，分数越高
        recencyScore = Math.exp(-decayFactor * yearDiff);
      } else {
        recencyScore = 0.3; // 未知年份给予基础分数
      }

      // 应用Recency偏差到Hybrid分数
      const biasedScore = result.hybrid_score * (1 + recencyScore * 0.5);

      return {
        ...result,
        recency_score: recencyScore,
        biased_score: biasedScore,
      };
    });
  }

  // RAG查询（核心方法，增强安全校验）
  async query(userQuery: string): Promise<RAGResponse> {
    // 1. 输入清洗和校验
    const { sanitized, isSuspicious } = this.sanitizeInput(userQuery);

    if (!sanitized) {
      return { answer: '请输入更具体的问题（至少2个字符）。', relatedAlumni: [] };
    }

    if (isSuspicious) {
      logger.warn({ query: userQuery.substring(0, 100) }, '检测到可疑输入，已过滤');
    }

    // 2. 熔断检查
    if (!this.circuitBreaker.canExecute()) {
      logger.warn('Circuit breaker OPEN，降级为关键词检索');
      return this.fallbackKeywordSearch(sanitized);
    }

    // 2.5 简单查询快速路径 — 不走完整 RAG，节省 token
    if (tokenBudget.isSimpleQuery(sanitized)) {
      logger.info({ query: sanitized }, '简单查询，走关键词快速路径');
      return this.fallbackKeywordSearch(sanitized);
    }

    // 2.8 Token 预算检查
    const budgetStatus = tokenBudget.getUsage();
    if (budgetStatus.daily.used >= budgetStatus.daily.limit) {
      logger.warn('Token 日预算已耗尽，降级为关键词检索');
      return this.fallbackKeywordSearch(sanitized);
    }

    // 3. 缓存检查
    const cacheKey = this.hashQuery(sanitized);
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      return cached.response;
    }

    try {
      // 备选：使用混合检索（Phase 4.1）
      // try {
      //   const { alumni, knowledge } = await this.hybridSearch(sanitized, {
      //     vectorLimit: 4,
      //     keywordLimit: 8,
      //     topK: 6,
      //     vectorWeight: 0.6,
      //     keywordWeight: 0.4,
      //   });

      //   // 应用Recency重排序
      //   const rerankedAlumni = this.applyRecencyBias(alumni);

      //   const prompt = this.buildPrompt(sanitized, knowledge, rerankedAlumni);
      //   const answer = await this.chat(prompt);

      //   const estimatedTokens = Math.ceil((prompt.length + answer.length) / 2);
      //   tokenBudget.record(estimatedTokens);

      //   const response: RAGResponse = {
      //     answer,
      //     relatedAlumni: rerankedAlumni.map(this.rowToAlumni),
      //   };

      //   this.cache.set(cacheKey, { response, timestamp: Date.now() });
      //   this.circuitBreaker.recordSuccess();
      //   return response;
      // } catch (hybridError) {
      //   logger.warn({ err: hybridError }, '混合检索失败，回退到传统RAG');
      // }

      // 传统RAG路径（保留用于backwards compatibility）
      // 3. 向量检索知识库
      const knowledgeResults = await this.searchKnowledge(sanitized, 3);

      // 4. 数据库关键词检索校友（修复 ILIKE 通配符注入）
      let relatedAlumni: any[] = [];
      try {
        const escapedQuery = this.escapeLikeWildcards(sanitized);
        await pool.query('SET search_path TO alumni_system, public');
        const result = await pool.query(
          `
          SELECT id, name, graduation_year, class_name, industry, biography, extra_info
          FROM alumni 
          WHERE name ILIKE $1 OR biography ILIKE $1 OR class_name ILIKE $1 OR industry ILIKE $1
          LIMIT 5
        `,
          [`%${escapedQuery}%`]
        );
        relatedAlumni = result.rows;
      } catch (dbError) {
        logger.warn({ err: dbError }, '数据库查询失败');
      }

      // 5. 构建提示词并调用AI
      const prompt = this.buildPrompt(sanitized, knowledgeResults, relatedAlumni);
      const answer = await this.chat(prompt);

      // 5.5 Token 预算记录（使用 llmService 的统一 token 估算）
      const estimatedTokens = estimateTokens(prompt + answer);
      tokenBudget.record(estimatedTokens);

      const response: RAGResponse = {
        answer,
        relatedAlumni: relatedAlumni.map(this.rowToAlumni),
      };

      this.cache.set(cacheKey, { response, timestamp: Date.now() });
      this.circuitBreaker.recordSuccess();
      return response;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.warn({ err: error }, 'RAG服务异常，降级为关键词检索');
      const fallback = await this.fallbackKeywordSearch(sanitized);
      fallback.degraded = true;
      return fallback;
    }
  }

  // 降级：关键词检索（使用增强版关键词搜索）
  private async fallbackKeywordSearch(query: string): Promise<RAGResponse> {
    try {
      const { results, keywordHits } = await this.keywordSearch(query, {
        limit: 10,
        addRecencyBias: true,
      });

      if (results.length === 0) {
        return {
          answer: `未找到与"${query}"匹配的校友信息。建议扩大搜索关键词或使用更通用的查询词。`,
          relatedAlumni: [],
        };
      }

      // 根据检索结果构建回答
      const alumniStr = results
        .slice(0, 5)
        .map(
          (r: any) =>
            `- **${r.name}**（${r.graduation_year || '未知年份'}届）${
              r.class_name ? `，${r.class_name}` : ''
            }${r.industry ? `，${r.industry}` : ''}${
              r.current_city ? `，现居${r.current_city}` : ''
            }${r.work_unit ? `，${r.work_unit}` : ''}`
        )
        .join('\n');

      return {
        answer: `找到${keywordHits}条相关记录（显示前${Math.min(5, results.length)}条）：\n\n${alumniStr}\n\n提示：如需查看完整信息，请使用更具体的关键词（如姓名+年份）。`,
        relatedAlumni: results.map(this.rowToAlumni),
      };
    } catch (error) {
      logger.error({ err: error }, '关键词检索失败');
      return {
        answer: '抱歉，搜索服务暂时不可用，请稍后重试。可尝试使用更简单的关键词查询。',
        relatedAlumni: [],
      };
    }
  }

  private rowToAlumni(row: any): Alumni {
    return {
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
      extraInfo: row.extra_info,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 刷新 System Prompt 缓存（管理后台修改配置后调用）
   */
  refreshSystemPrompt(): void {
    this.systemPromptCache = null;
    this.systemPromptCacheTime = 0;
  }

  clearCache(): void {
    this.cache.clear();
  }
  getProvider(): string {
    return llmConfig.primary?.provider || 'unknown';
  }
  getTokenBudgetUsage() {
    return tokenBudget.getUsage();
  }
}

export const ragService = new RAGService();

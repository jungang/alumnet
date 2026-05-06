/**
 * LLM Service — 统一 LLM 调用层
 *
 * 功能:
 *   - callLLM(prompt, options) 统一接口
 *   - 多提供商支持: OpenAI / Qwen / GLM
 *   - Token 估算: 中文字符 / 2 ≈ token 数
 *   - Prompt 缓存: 5分钟去重 (hash-based)
 *   - 重试: 3次指数退避
 *   - 超时: 可配置 (默认 30s)
 *   - 提供商故障转移: primary → fallback
 *   - 速率限制: 滑动窗口 RPM 控制
 *   - Token 预算追踪: 80% 报警
 *
 * TODO: 流式响应 (streaming) 支持
 */

import crypto from 'node:crypto';
import {
  llmConfig,
  hasAvailableProvider,
  type ProviderConfig,
  type LLMProvider,
} from '../config/llm';
import logger from '../config/logger';

// ---- Types ----

export interface LLMCallOptions {
  /** 系统提示词 (可选) */
  systemPrompt?: string;
  /** 模型覆盖 (可选, 优先级高于配置) */
  model?: string;
  /** 温度覆盖 */
  temperature?: number;
  /** 最大 token 覆盖 */
  maxTokens?: number;
  /** 超时覆盖 (ms) */
  timeoutMs?: number;
  /** 是否跳过缓存 (默认 false) */
  skipCache?: boolean;
  /** 额外元数据 (用于日志) */
  metadata?: Record<string, unknown>;
}

export interface LLMCallResult {
  /** LLM 回复文本 */
  content: string;
  /** 估算的 prompt token 数 */
  promptTokens: number;
  /** 估算的 completion token 数 */
  completionTokens: number;
  /** 实际使用的提供商 */
  provider: LLMProvider;
  /** 是否命中缓存 */
  cached: boolean;
  /** 重试次数 */
  retries: number;
}

// ---- Prompt Cache (hash-based, 5min TTL) ----

interface CacheEntry {
  result: LLMCallResult;
  expiresAt: number;
}

class PromptCache {
  private store = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs = 300_000) {
    this.ttlMs = ttlMs;
  }

  private hashKey(systemPrompt: string, userPrompt: string, model: string): string {
    return crypto
      .createHash('sha256')
      .update(`${systemPrompt}|||${userPrompt}|||${model}`)
      .digest('hex')
      .slice(0, 16);
  }

  get(systemPrompt: string, userPrompt: string, model: string): LLMCallResult | null {
    const key = this.hashKey(systemPrompt, userPrompt, model);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return { ...entry.result, cached: true };
  }

  set(systemPrompt: string, userPrompt: string, model: string, result: LLMCallResult): void {
    const key = this.hashKey(systemPrompt, userPrompt, model);
    this.store.set(key, {
      result: { ...result, cached: false },
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.store.clear();
  }

  /** 清理过期条目 */
  prune(): number {
    let removed = 0;
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }
}

// ---- Rate Limiter (滑动窗口 RPM) ----

class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerMinute: number;

  constructor(maxPerMinute = 60) {
    this.maxPerMinute = maxPerMinute;
  }

  /** 检查是否可以执行, 返回需要等待的毫秒数 (0 = 可以执行) */
  check(): number {
    const now = Date.now();
    const windowStart = now - 60_000;

    // 清理过期时间戳
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length >= this.maxPerMinute) {
      // 返回最早一个请求过期的等待时间
      return this.timestamps[0] - windowStart + 1;
    }
    return 0;
  }

  /** 记录一次请求 */
  record(): void {
    this.timestamps.push(Date.now());
  }

  get remaining(): number {
    const windowStart = Date.now() - 60_000;
    this.timestamps = this.timestamps.filter((t) => t > windowStart);
    return Math.max(0, this.maxPerMinute - this.timestamps.length);
  }
}

// ---- Token Budget Tracker ----

class TokenBudgetTracker {
  private dailyUsage = 0;
  private monthlyUsage = 0;
  private dailyResetDate = new Date().toISOString().slice(0, 10);
  private monthlyResetMonth = new Date().toISOString().slice(0, 7);

  record(tokens: number): void {
    this.checkReset();
    this.dailyUsage += tokens;
    this.monthlyUsage += tokens;

    // 80% 警告
    if (
      this.dailyUsage >= llmConfig.dailyTokenLimit * llmConfig.tokenWarnThreshold &&
      this.dailyUsage < llmConfig.dailyTokenLimit
    ) {
      logger.warn(
        {
          dailyUsage: this.dailyUsage,
          limit: llmConfig.dailyTokenLimit,
          pct: Math.round((this.dailyUsage / llmConfig.dailyTokenLimit) * 100),
        },
        'LLM Token 日预算接近上限 (>=80%)'
      );
    }

    if (this.dailyUsage >= llmConfig.dailyTokenLimit) {
      logger.error(
        { dailyUsage: this.dailyUsage, limit: llmConfig.dailyTokenLimit },
        'LLM Token 日预算已耗尽'
      );
    }
  }

  isExhausted(): boolean {
    this.checkReset();
    return this.dailyUsage >= llmConfig.dailyTokenLimit;
  }

  getUsage() {
    this.checkReset();
    return {
      daily: { used: this.dailyUsage, limit: llmConfig.dailyTokenLimit },
      monthly: { used: this.monthlyUsage, limit: llmConfig.monthlyTokenLimit },
    };
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
}

// ---- Token Estimation ----

/**
 * 估算 token 数
 * 中文: 字符数 / 2
 * 英文/混合: 字符数 / 4 (保守估计)
 * 最终取较大值, 确保不低估
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // 计算中文字符数
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const nonCjkCount = text.length - cjkCount;

  const cjkTokens = Math.ceil(cjkCount / 2);
  const nonCjkTokens = Math.ceil(nonCjkCount / 4);

  return cjkTokens + nonCjkTokens;
}

// ---- Core LLM Service ----

class LLMService {
  private cache: PromptCache;
  private rateLimiter: RateLimiter;
  private tokenBudget: TokenBudgetTracker;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cache = new PromptCache(llmConfig.cacheTtlMs);
    this.rateLimiter = new RateLimiter(llmConfig.rateLimitRpm);
    this.tokenBudget = new TokenBudgetTracker();

    // 定期清理过期缓存
    this.pruneTimer = setInterval(
      () => {
        const removed = this.cache.prune();
        if (removed > 0) {
          logger.debug({ removed }, 'LLM prompt cache pruned');
        }
      },
      5 * 60 * 1000 // 5 分钟清理一次
    );

    // 不阻止进程退出
    if (this.pruneTimer.unref) {
      this.pruneTimer.unref();
    }
  }

  /**
   * 统一 LLM 调用接口
   *
   * @param prompt 用户提示词
   * @param options 可选参数
   * @returns LLM 调用结果
   */
  async callLLM(prompt: string, options: LLMCallOptions = {}): Promise<LLMCallResult> {
    const {
      systemPrompt = '',
      model,
      temperature = llmConfig.temperature,
      maxTokens = llmConfig.maxTokens,
      timeoutMs = llmConfig.timeoutMs,
      skipCache = false,
      metadata,
    } = options;

    // 1. 检查可用提供商
    if (!hasAvailableProvider()) {
      throw new LLMError('未配置任何 LLM 提供商', 'NO_PROVIDER');
    }

    // 2. Token 预算检查
    if (this.tokenBudget.isExhausted()) {
      throw new LLMError('Token 日预算已耗尽', 'TOKEN_BUDGET_EXHAUSTED');
    }

    // 3. 速率限制
    const waitMs = this.rateLimiter.check();
    if (waitMs > 0) {
      logger.warn({ waitMs }, 'LLM 速率限制, 请求排队');
      await sleep(waitMs);
    }

    // 4. 缓存检查 (Prompt 去重)
    const resolvedModel = model || getActiveModel();
    if (!skipCache) {
      const cached = this.cache.get(systemPrompt, prompt, resolvedModel);
      if (cached) {
        logger.debug({ metadata }, 'LLM prompt cache hit');
        return cached;
      }
    }

    // 5. 带重试的调用 (含提供商故障转移)
    const result = await this.callWithRetryAndFailover(
      systemPrompt,
      prompt,
      resolvedModel,
      temperature,
      maxTokens,
      timeoutMs,
      metadata
    );

    // 6. 记录 token 消耗
    this.tokenBudget.record(result.promptTokens + result.completionTokens);

    // 7. 写入缓存
    if (!skipCache) {
      this.cache.set(systemPrompt, prompt, resolvedModel, result);
    }

    this.rateLimiter.record();

    return result;
  }

  /**
   * 带重试 + 故障转移的调用
   */
  private async callWithRetryAndFailover(
    systemPrompt: string,
    prompt: string,
    model: string,
    temperature: number,
    maxTokens: number,
    timeoutMs: number,
    metadata?: Record<string, unknown>
  ): Promise<LLMCallResult> {
    const providers: ProviderConfig[] = [];
    if (llmConfig.primary) providers.push(llmConfig.primary);
    if (llmConfig.fallback) providers.push(llmConfig.fallback);

    let lastError: Error | null = null;

    for (const provider of providers) {
      const maxRetries = llmConfig.maxRetries;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const content = await this.callProvider(provider, {
            systemPrompt,
            prompt,
            model: model || provider.model,
            temperature,
            maxTokens,
            timeoutMs,
          });

          const promptTokens = estimateTokens(systemPrompt + prompt);
          const completionTokens = estimateTokens(content);

          return {
            content,
            promptTokens,
            completionTokens,
            provider: provider.provider,
            cached: false,
            retries: attempt,
          };
        } catch (error) {
          lastError = error as Error;

          // 不可重试的错误直接跳出
          if (isNonRetryableError(error)) {
            logger.warn(
              { err: error, provider: provider.provider, attempt },
              'LLM 不可重试错误, 切换提供商'
            );
            break; // 跳到下一个提供商
          }

          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10_000); // 指数退避, 上限 10s
            logger.warn(
              { err: error, provider: provider.provider, attempt, delayMs: delay },
              'LLM 调用失败, 重试中'
            );
            await sleep(delay);
          } else {
            logger.warn(
              { err: error, provider: provider.provider, attempts: maxRetries + 1 },
              'LLM 调用重试耗尽, 尝试下一个提供商'
            );
          }
        }
      }
    }

    throw new LLMError(
      `所有 LLM 提供商均失败: ${lastError?.message || '未知错误'}`,
      'ALL_PROVIDERS_FAILED',
      lastError ?? undefined
    );
  }

  /**
   * 调用单个提供商
   * 所有提供商均使用 OpenAI 兼容接口
   */
  private async callProvider(
    provider: ProviderConfig,
    params: {
      systemPrompt: string;
      prompt: string;
      model: string;
      temperature: number;
      maxTokens: number;
      timeoutMs: number;
    }
  ): Promise<string> {
    const { systemPrompt, prompt, model, temperature, maxTokens, timeoutMs } = params;

    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new ProviderError(
          `LLM API ${response.status}: ${body.slice(0, 200)}`,
          provider.provider,
          response.status
        );
      }

      const data = await response.json();

      if (!data.choices?.[0]?.message?.content) {
        throw new ProviderError('LLM 返回数据格式异常', provider.provider, 0);
      }

      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ---- 便捷方法 ----

  /** 获取缓存统计 */
  getCacheStats() {
    return {
      size: (this.cache as any).store?.size || 0,
      ttlMs: llmConfig.cacheTtlMs,
    };
  }

  /** 获取速率限制状态 */
  getRateLimitStatus() {
    return {
      remaining: this.rateLimiter.remaining,
      limit: llmConfig.rateLimitRpm,
    };
  }

  /** 获取 Token 预算使用情况 */
  getTokenBudget() {
    return this.tokenBudget.getUsage();
  }

  /** 清除缓存 */
  clearCache(): void {
    this.cache.clear();
  }

  /** 关闭服务 (清理定时器) */
  shutdown(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }
}

// ---- Error Classes ----

export class LLMError extends Error {
  code: string;
  cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.cause = cause;
  }
}

export class ProviderError extends Error {
  provider: LLMProvider;
  status: number;

  constructor(message: string, provider: LLMProvider, status: number) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.status = status;
  }
}

// ---- Helpers ----

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getActiveModel(): string {
  const provider = llmConfig.primary || llmConfig.fallback;
  return provider?.model || 'unknown';
}

function isNonRetryableError(error: unknown): boolean {
  if (error instanceof ProviderError) {
    // 4xx 错误 (除 429) 不可重试
    return error.status >= 400 && error.status < 500 && error.status !== 429;
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    // 超时可以重试
    return false;
  }
  return false;
}

// ---- Singleton Export ----

export const llmService = new LLMService();
export default llmService;

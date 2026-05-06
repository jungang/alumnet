/**
 * LLM 配置
 * 统一管理 AI 提供商、模型参数、Token 限制等
 *
 * 环境变量:
 *   LLM_PROVIDER       - 主提供商: openai | qwen | glm (默认 glm)
 *   LLM_FALLBACK       - 备用提供商 (可选)
 *   LLM_API_KEY_*      - 各提供商 API Key
 *   LLM_MODEL          - 模型名 (默认各提供商默认模型)
 *   LLM_BASE_URL_*     - 各提供商自定义 Base URL (可选)
 *   LLM_MAX_TOKENS     - 单次回复最大 token (默认 600)
 *   LLM_TEMPERATURE    - 采样温度 (默认 0.7)
 *   LLM_TIMEOUT_MS     - 请求超时毫秒 (默认 30000)
 *   LLM_CACHE_TTL_MS   - Prompt 缓存 TTL (默认 300000 = 5分钟)
 *   LLM_MAX_RETRIES    - 最大重试次数 (默认 3)
 *   LLM_RATE_LIMIT_RPM - 每分钟请求上限 (默认 60)
 */

// ---- 提供商类型 ----
export type LLMProvider = 'openai' | 'qwen' | 'glm';

export interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

// ---- 各提供商默认配置 ----
const PROVIDER_DEFAULTS: Record<LLMProvider, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  glm: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4',
  },
};

// ---- 解析提供商配置 ----
function resolveProviderConfig(name: LLMProvider): ProviderConfig | null {
  const envKeySuffix = name.toUpperCase();
  const apiKey = process.env[`LLM_API_KEY_${envKeySuffix}`] || '';

  // 兼容旧环境变量 (GLM_API_KEY / DEEPSEEK_API_KEY)
  let resolvedKey = apiKey;
  if (name === 'glm' && !apiKey) {
    resolvedKey = process.env.GLM_API_KEY || '';
  }

  if (!resolvedKey) return null;

  const defaults = PROVIDER_DEFAULTS[name];
  return {
    provider: name,
    apiKey: resolvedKey,
    baseUrl: process.env[`LLM_BASE_URL_${envKeySuffix}`] || defaults.baseUrl,
    model: process.env.LLM_MODEL || defaults.model,
  };
}

// ---- 导出配置对象 ----
export const llmConfig = {
  /** 主提供商 */
  primary: resolveProviderConfig((process.env.LLM_PROVIDER || 'glm') as LLMProvider),

  /** 备用提供商 */
  fallback: process.env.LLM_FALLBACK
    ? resolveProviderConfig(process.env.LLM_FALLBACK as LLMProvider)
    : null,

  /** 单次回复最大 token */
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '600', 10),

  /** 采样温度 */
  temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),

  /** 请求超时 (ms) */
  timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10),

  /** Prompt 缓存 TTL (ms) */
  cacheTtlMs: parseInt(process.env.LLM_CACHE_TTL_MS || '300000', 10),

  /** 最大重试次数 */
  maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3', 10),

  /** 每分钟请求上限 (rate limiting) */
  rateLimitRpm: parseInt(process.env.LLM_RATE_LIMIT_RPM || '60', 10),

  /** Token 预算: 日上限 */
  dailyTokenLimit: parseInt(process.env.RAG_DAILY_TOKEN_LIMIT || '100000', 10),

  /** Token 预算: 月上限 */
  monthlyTokenLimit: parseInt(process.env.RAG_MONTHLY_TOKEN_LIMIT || '3000000', 10),

  /** Token 预算警告阈值 (百分比) */
  tokenWarnThreshold: 0.8,
} as const;

/** 校验: 至少有一个可用提供商 */
export function hasAvailableProvider(): boolean {
  return llmConfig.primary !== null || llmConfig.fallback !== null;
}

/** 获取当前活跃提供商 (primary 优先) */
export function getActiveProvider(): ProviderConfig | null {
  return llmConfig.primary || llmConfig.fallback || null;
}

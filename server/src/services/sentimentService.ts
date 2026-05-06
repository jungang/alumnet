/**
 * 情感分析与语气适配服务
 * 基于关键词的情感分析（无外部 API 依赖）
 */

import logger from '../config/logger';

// 情感关键词定义
const POSITIVE_KEYWORDS = [
  '感谢',
  '开心',
  '成功',
  '优秀',
  '荣幸',
  '骄傲',
  '感恩',
  '喜悦',
  '欢聚',
  '祝贺',
] as const;

const NEGATIVE_KEYWORDS = [
  '失望',
  '困难',
  '遗憾',
  '遗失',
  '失联',
  '困惑',
  '担忧',
  '怀念',
  '伤心',
  '不满',
] as const;

// 情感类型
export type SentimentType = 'positive' | 'neutral' | 'negative';

// 语气适配类型
export type ToneType = 'warm' | 'professional' | 'empathetic';

// 单条情感分析结果
export interface SentimentResult {
  text: string;
  sentiment: SentimentType;
  score: number;
  positiveMatches: string[];
  negativeMatches: string[];
}

// 语气适配结果
export interface ToneAdaptation {
  sentiment: SentimentType;
  tone: ToneType;
  suggestion: string;
  responseStyle: string;
}

// 批量分析结果
export interface BatchSentimentResult {
  results: SentimentResult[];
  summary: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    averageScore: number;
  };
}

class SentimentService {
  /**
   * 分析单条文本的情感倾向
   * 评分公式: (positive_count - negative_count) / total_keywords，范围 [-1, 1]
   */
  analyzeSentiment(text: string): SentimentResult {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        text: text || '',
        sentiment: 'neutral',
        score: 0,
        positiveMatches: [],
        negativeMatches: [],
      };
    }

    // 匹配正向关键词
    const positiveMatches = POSITIVE_KEYWORDS.filter((kw) => text.includes(kw));
    // 匹配负向关键词
    const negativeMatches = NEGATIVE_KEYWORDS.filter((kw) => text.includes(kw));

    const totalKeywords = positiveMatches.length + negativeMatches.length;

    // 计算情感分数
    let score = 0;
    if (totalKeywords > 0) {
      score = (positiveMatches.length - negativeMatches.length) / totalKeywords;
      // 确保范围 [-1, 1]
      score = Math.max(-1, Math.min(1, score));
    }

    // 判定情感类型
    let sentiment: SentimentType = 'neutral';
    if (score > 0.1) {
      sentiment = 'positive';
    } else if (score < -0.1) {
      sentiment = 'negative';
    }

    logger.info(
      {
        sentiment,
        score,
        positiveCount: positiveMatches.length,
        negativeCount: negativeMatches.length,
      },
      '情感分析完成'
    );

    return {
      text,
      sentiment,
      score,
      positiveMatches,
      negativeMatches,
    };
  }

  /**
   * 根据情感类型推荐语气适配策略
   * positive → warm（温暖热情）
   * neutral → professional（专业严谨）
   * negative → empathetic（共情关怀）
   */
  getToneAdaptation(sentiment: SentimentType): ToneAdaptation {
    const toneMap: Record<SentimentType, ToneType> = {
      positive: 'warm',
      neutral: 'professional',
      negative: 'empathetic',
    };

    const suggestionMap: Record<SentimentType, string> = {
      positive: '用户情绪积极，建议采用温暖热情的语气，可以适当表达共鸣和祝贺。',
      neutral: '用户情绪平稳，建议采用专业严谨的语气，提供清晰准确的信息。',
      negative: '用户情绪低落或消极，建议采用共情关怀的语气，表达理解和安慰。',
    };

    const responseStyleMap: Record<SentimentType, string> = {
      positive: '热情回应，适当使用感叹句和积极词汇，鼓励用户继续保持积极态度。',
      neutral: '简洁明了，避免过度修饰，聚焦事实和数据，保持专业形象。',
      negative: '温和体贴，先表达理解和关心，再提供帮助或建议，避免说教语气。',
    };

    const tone = toneMap[sentiment];

    return {
      sentiment,
      tone,
      suggestion: suggestionMap[sentiment],
      responseStyle: responseStyleMap[sentiment],
    };
  }

  /**
   * 批量分析多条文本的情感倾向
   */
  batchAnalyze(texts: string[]): BatchSentimentResult {
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return {
        results: [],
        summary: { total: 0, positive: 0, neutral: 0, negative: 0, averageScore: 0 },
      };
    }

    const results = texts.map((text) => this.analyzeSentiment(text));

    const positive = results.filter((r) => r.sentiment === 'positive').length;
    const negative = results.filter((r) => r.sentiment === 'negative').length;
    const neutral = results.length - positive - negative;

    const averageScore =
      results.length > 0
        ? Math.round((results.reduce((sum, r) => sum + r.score, 0) / results.length) * 1000) / 1000
        : 0;

    logger.info(
      { total: texts.length, positive, neutral, negative, averageScore },
      '批量情感分析完成'
    );

    return {
      results,
      summary: {
        total: texts.length,
        positive,
        neutral,
        negative,
        averageScore,
      },
    };
  }
}

// 单例导出
export const sentimentService = new SentimentService();

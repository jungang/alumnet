/**
 * API 限频配置 — express-rate-limit
 * 公开接口 100/min, 管理接口 30/min, RAG 20/min
 */

import rateLimit from 'express-rate-limit';
import logger from '../config/logger';

// 通用限频：所有 API
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: '请求过于频繁，请稍后重试' },
  skip: (req) => req.path === '/health' || req.path === '/api/health',
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'API 限频触发');
    res.status(429).json(options.message);
  },
});

// 管理接口限频：更严格
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: '管理接口请求过于频繁' },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, '管理接口限频触发');
    res.status(429).json(options.message);
  },
});

// RAG 查询限频：最严格
export const ragLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: 'AI 查询过于频繁，请稍后重试' },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'RAG 限频触发');
    res.status(429).json(options.message);
  },
});

// 认证接口限频：防暴力破解
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMIT', message: '登录尝试过多，请15分钟后重试' },
  handler: (req, res, next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, '认证限频触发');
    res.status(429).json(options.message);
  },
});

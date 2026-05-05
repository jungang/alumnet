/**
 * 结构化日志配置 — pino
 * 替代 console.log，支持 JSON 格式输出（生产）和 pretty 格式（开发）
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // 生产环境：纯 JSON，适合日志聚合
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
  // 基础字段
  base: {
    service: 'alumni-api',
    env: process.env.NODE_ENV || 'development',
  },
});

export default logger;

// 便捷导出
export const { info, warn, error, debug, fatal } = logger;

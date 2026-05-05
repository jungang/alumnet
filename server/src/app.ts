import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import logger from './config/logger';

// 路由
import authRoutes from './routes/auth';
import alumniRoutes from './routes/alumni';
import adminRoutes from './routes/admin'; // 拆分后的 admin/index.ts
import contentRoutes from './routes/content';
import uploadRoutes from './routes/upload';
import backupRoutes from './routes/backup';
import selfServiceRoutes from './routes/selfService';
import qaRoutes from './routes/qa';
import { setupSwagger } from './routes/api-docs';
import { apiLimiter, adminLimiter, ragLimiter, authLimiter } from './middleware/rateLimit';
import path from 'path';

// 安全中间件（延迟导入避免类型冲突）
import helmet from 'helmet';

// 统一错误处理
import { globalErrorHandler, NotFoundError } from './middleware/errorHandler';

dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(
  helmet({
    contentSecurityPolicy: false, // 暂时禁用 CSP，Swagger UI 兼容性问题后续配置
    crossOriginEmbedderPolicy: false,
  }) as any
);

// CORS 限制：仅允许配置的前端域名访问
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174']; // 开发环境默认值

app.use(
  cors({
    origin: (origin, callback) => {
      // 允许无 origin 的请求（服务端请求、Postman 等）
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'request');
  next();
});

// 健康检查 — 增强版（含数据库状态 + 关闭感知）
app.get('/health', async (_req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ status: 'shutting_down', timestamp: new Date().toISOString() });
    return;
  }

  const health: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // 检查数据库连接
  try {
    const { pool } = await import('./config/database');
    const start = Date.now();
    await pool.query('SELECT 1');
    health.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err: any) {
    health.database = { status: 'error', message: err.message };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api/health', async (_req, res) => {
  // 复用 /health 逻辑
  const health: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  try {
    const { pool } = await import('./config/database');
    const start = Date.now();
    await pool.query('SELECT 1');
    health.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err: any) {
    health.database = { status: 'error', message: err.message };
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// 静态文件服务（上传的文件）—— 带 referer/origin 认证保护
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const uploadPath = path.resolve(process.cwd(), uploadDir);

// 允许访问 uploads 的 origin 白名单（复用 CORS_ORIGINS 配置）
const uploadAllowedReferers = [...allowedOrigins, `http://localhost:${PORT}`];

app.use(
  '/uploads',
  (req, res, next) => {
    const referer = req.headers.referer || req.headers.referrer || '';
    const origin = req.headers.origin || '';

    // 场景1：浏览器直接访问（无 referer/origin）— 允许（兼容性）
    // 场景2：有 referer/origin — 必须来自白名单域名
    const hasRefererOrOrigin = referer || origin;
    if (!hasRefererOrOrigin) {
      // 无来源信息：可能是直接访问或程序请求，允许通过
      return next();
    }

    // 检查 referer 或 origin 是否匹配白名单
    const source =
      (typeof referer === 'string' ? referer : referer?.[0]) ||
      (typeof origin === 'string' ? origin : origin?.[0]) ||
      '';
    const isAllowed = uploadAllowedReferers.some((allowed) => {
      try {
        const sourceUrl = new URL(source);
        const allowedUrl = new URL(allowed);
        return sourceUrl.origin === allowedUrl.origin;
      } catch {
        return source.startsWith(allowed);
      }
    });

    if (isAllowed) {
      return next();
    }

    // 来源不在白名单 — 拒绝访问
    logger.warn({ source }, 'Upload access denied');
    res.status(403).json({ success: false, code: 'FORBIDDEN', message: '无权访问此资源' });
  },
  express.static(uploadPath)
);

// API路由
// API 限频 — 全局限频 + 特定路由加强
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/qa', qaRoutes);
app.use('/api/self-service', selfServiceRoutes);

// Swagger API文档
setupSwagger(app);

// 404处理 — 使用统一 NotFoundError
app.use((_req, _res, next) => {
  next(new NotFoundError('接口'));
});

// 全局错误处理 — 替代旧的 catch-all
app.use(globalErrorHandler);

// 关闭状态标志
let isShuttingDown = false;
export function isServerShuttingDown() {
  return isShuttingDown;
}

// 启动服务器（测试环境跳过，由 supertest 管理端口）
async function start() {
  if (process.env.NODE_ENV === 'test') {
    logger.info('测试环境，跳过服务器启动');
    return;
  }

  // 测试数据库连接
  const dbConnected = await testConnection();
  if (!dbConnected) {
    logger.warn('数据库连接失败，部分功能可能不可用');
  }

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, '服务器已启动');
  });

  // 关闭期间保持连接但拒绝新请求
  server.on('connection', (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    }
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return; // 防止重复触发
    isShuttingDown = true;
    logger.info({ signal }, '收到关闭信号，正在优雅关闭...');

    // 1. 停止接受新连接
    server.close(() => {
      logger.info('HTTP 服务器已停止接受新连接');
    });

    // 2. 关闭数据库连接池
    try {
      const { pool } = await import('./config/database');
      await pool.end();
      logger.info('数据库连接池已关闭');
    } catch (e) {
      logger.error({ err: e }, '关闭数据库连接池失败');
    }

    // 3. 等待现有请求完成（最多 8 秒）
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (server.connections === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 8000);
    });

    logger.info('优雅关闭完成');
    process.exit(0);

    // 总超时：12 秒后强制退出（由外部 setTimeout 兜底）
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 未捕获异常处理
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    shutdown('unhandledRejection');
  });
}

start();

export default app;

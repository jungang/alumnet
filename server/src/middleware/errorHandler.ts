/**
 * 统一错误处理 - AppError 类 + 全局错误中间件
 * 
 * 设计原则：
 * 1. 所有业务错误继承 AppError，自动设置 HTTP 状态码
 * 2. 未预期的 Error 自动包装为 500 InternalError
 * 3. 错误响应统一格式：{ success: false, code: string, message: string }
 * 4. 开发环境包含 stack，生产环境隐藏
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// ---- 错误基类 ----

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    // 维护正确的原型链（TypeScript 继承 Error 的已知问题）
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ---- 预定义错误类 ----

/** 400 Bad Request — 输入校验失败 */
export class ValidationError extends AppError {
  constructor(message: string = '输入参数校验失败', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** 401 Unauthorized — 未认证 */
export class AuthenticationError extends AppError {
  constructor(message: string = '未认证，请先登录') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/** 403 Forbidden — 权限不足 */
export class ForbiddenError extends AppError {
  constructor(message: string = '权限不足，无法执行此操作') {
    super(message, 403, 'FORBIDDEN_ERROR', true);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/** 404 Not Found — 资源不存在 */
export class NotFoundError extends AppError {
  constructor(resource: string = '资源', id?: string) {
    const message = id ? `${resource} (${id}) 不存在` : `${resource}不存在`;
    super(message, 404, 'NOT_FOUND', true);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/** 409 Conflict — 资源冲突 */
export class ConflictError extends AppError {
  constructor(message: string = '资源冲突') {
    super(message, 409, 'CONFLICT_ERROR', true);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/** 429 Too Many Requests — 限频 */
export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁，请稍后再试') {
    super(message, 429, 'RATE_LIMIT_ERROR', true);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/** 500 Internal Server Error */
export class InternalError extends AppError {
  constructor(message: string = '服务器内部错误') {
    super(message, 500, 'INTERNAL_ERROR', false);
    Object.setPrototypeOf(this, InternalError.prototype);
  }
}

/** 503 Service Unavailable — 外部服务不可用 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string = '服务') {
    super(`${service}暂不可用，请稍后再试`, 503, 'SERVICE_UNAVAILABLE', true);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

// ---- 辅助函数 ----

/** 从未知错误创建 AppError */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // CORS 错误
    if (error.message === 'CORS not allowed') {
      return new ForbiddenError('跨域请求不被允许');
    }
    // 数据库唯一约束冲突
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return new ConflictError('数据已存在，请检查是否有重复记录');
    }
    // 数据库外键约束
    if (error.message?.includes('foreign key constraint')) {
      return new ValidationError('关联数据不存在，请检查引用');
    }
    // 数据库连接
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connection')) {
      return new ServiceUnavailableError('数据库');
    }

    return new InternalError(error.message);
  }

  return new InternalError('未知错误');
}

// ---- 全局错误中间件 ----

export function globalErrorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const appError = toAppError(err);

  // 构造响应体
  const response: Record<string, any> = {
    success: false,
    code: appError.code,
    message: appError.message,
  };

  // 开发环境附带详情
  if (process.env.NODE_ENV !== 'production') {
    response.stack = appError.stack;
    if (appError.details) {
      response.details = appError.details;
    }
  }

  // 非运营错误（程序 bug）记录完整堆栈
  if (!appError.isOperational) {
    logger.error({ code: appError.code, message: appError.message, stack: appError.stack }, 'UNHANDLED ERROR');
  } else {
    // 运营错误（业务逻辑错误）只记录摘要
    logger.warn({ code: appError.code, status: appError.statusCode, message: appError.message }, 'Business error');
  }

  res.status(appError.statusCode).json(response);
}

// ---- asyncHandler 包装器 ----

/** 包装异步路由处理器，自动捕获 Promise 异常 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

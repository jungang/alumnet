/**
 * 多轮对话路由
 *
 * Phase 5.5: 提供多轮对话 API，支持上下文管理
 * - POST   /api/conversation/message           — 发送消息并获取 AI 回复（含上下文）
 * - GET    /api/conversation/history/:sessionId — 获取对话历史
 * - DELETE /api/conversation/history/:sessionId — 清除对话历史
 * - GET    /api/conversation/stats/:sessionId   — 获取会话统计
 */

import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { conversationService } from '../services/conversationService';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import logger from '../config/logger';

const router: Router = Router();

// ========== 验证辅助 ==========

/** sessionId 格式：允许字母、数字、连字符、下划线，长度 8-128 */
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

function validateSessionId(sessionId: string): void {
  if (!sessionId || !SESSION_ID_REGEX.test(sessionId)) {
    throw new AppError(
      'sessionId 格式无效（仅允许字母、数字、连字符、下划线，长度8-128）',
      400,
      'VALIDATION_ERROR'
    );
  }
}

// ========== 路由 ==========

/**
 * POST /api/conversation/message
 *
 * 发送消息并获取 AI 回复（自动维护上下文）
 *
 * Body:
 *   sessionId: string  — 会话 ID（客户端生成或服务端分配）
 *   message: string    — 用户消息
 *   contextLimit?: number — 可选，上下文窗口大小（默认 10）
 */
router.post(
  '/message',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId, message, contextLimit } = req.body;

    // 参数校验
    if (!sessionId) {
      throw new AppError('请提供 sessionId', 400, 'VALIDATION_ERROR');
    }
    validateSessionId(sessionId);

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new AppError('请提供消息内容', 400, 'VALIDATION_ERROR');
    }

    if (message.length > 2000) {
      throw new AppError('消息内容不能超过2000字符', 400, 'VALIDATION_ERROR');
    }

    // contextLimit 范围校验
    const limit =
      contextLimit !== undefined
        ? Math.min(Math.max(parseInt(String(contextLimit), 10) || 10, 1), 50)
        : 10;

    logger.info(
      { sessionId, msgLen: message.length, contextLimit: limit },
      'conversation: message request'
    );

    const result = await conversationService.sendMessage(sessionId, message.trim(), limit);

    res.json({
      success: true,
      data: {
        sessionId,
        answer: result.answer,
        relatedAlumni: result.relatedAlumni,
        messageCount: result.messageCount,
      },
    });
  })
);

/**
 * GET /api/conversation/history/:sessionId
 *
 * 获取指定会话的对话历史
 */
router.get(
  '/history/:sessionId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    validateSessionId(sessionId);

    const history = conversationService.getHistory(sessionId);
    const stats = conversationService.getSessionStats(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        messages: history,
        messageCount: stats.messageCount,
        createdAt: stats.createdAt,
        lastActiveAt: stats.lastActiveAt,
      },
    });
  })
);

/**
 * DELETE /api/conversation/history/:sessionId
 *
 * 清除指定会话的对话历史
 */
router.delete(
  '/history/:sessionId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    validateSessionId(sessionId);

    const cleared = conversationService.clearContext(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        cleared,
        message: cleared ? '对话历史已清除' : '会话不存在或已过期',
      },
    });
  })
);

/**
 * GET /api/conversation/stats/:sessionId
 *
 * 获取指定会话的统计信息
 */
router.get(
  '/stats/:sessionId',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    validateSessionId(sessionId);

    const stats = conversationService.getSessionStats(sessionId);

    res.json({
      success: true,
      data: {
        sessionId,
        ...stats,
      },
    });
  })
);

export default router;

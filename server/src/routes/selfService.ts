/**
 * 校友自助服务路由 — 无需管理员权限，校友自行使用
 * 认证方式：通过学号或姓名+毕业年份查找自己的档案，获取临时 token
 */

import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { selfService } from '../services/selfService';

const router: Router = Router();

// 简单的 session 存储（生产环境应使用 JWT 或 Redis）
const sessions = new Map<string, { alumniId: string; expiresAt: number }>();

// 查找自己
router.post('/find-me', asyncHandler(async (req: Request, res: Response) => {
  const { identifier, graduationYear } = req.body;
  if (!identifier) {
    throw new AppError('请输入姓名或学号', 400, 'VALIDATION_ERROR');
  }

  const profile = await selfService.findMyProfile(identifier, graduationYear);
  if (!profile) {
    return res.json({ success: false, message: '未找到匹配的校友档案' });
  }

  // 生成临时 session token（1小时有效）
  const token = `self_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessions.set(token, { alumniId: profile.id, expiresAt: Date.now() + 3600000 });

  res.json({ success: true, data: { profile, token } });
}));

// 中间件：验证自助 session
function selfSession(req: Request, _res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;
  if (!token) {
    throw new AppError('请先登录', 401, 'UNAUTHORIZED');
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    throw new AppError('会话已过期，请重新登录', 401, 'SESSION_EXPIRED');
  }

  (req as any).selfAlumniId = session.alumniId;
  next();
}

// 获取同班同学
router.get('/classmates', selfSession, asyncHandler(async (req: Request, res: Response) => {
  const alumniId = (req as any).selfAlumniId;
  const classmates = await selfService.getClassmates(alumniId);
  res.json({ success: true, data: classmates });
}));

// 更新自己的信息
router.patch('/my-profile', selfSession, asyncHandler(async (req: Request, res: Response) => {
  const alumniId = (req as any).selfAlumniId;
  const { industry, biography, email, phone, title } = req.body;

  const profile = await selfService.updateMyProfile(alumniId, {
    industry, biography, email, phone, title,
  });

  res.json({ success: true, data: profile });
}));

// 发起隐私握手
router.post('/handshake', selfSession, asyncHandler(async (req: Request, res: Response) => {
  const requesterId = (req as any).selfAlumniId;
  const { targetId } = req.body;
  if (!targetId) {
    throw new AppError('请指定目标校友', 400, 'VALIDATION_ERROR');
  }

  const handshake = await selfService.requestHandshake(requesterId, targetId);
  res.json({ success: true, data: handshake });
}));

// 响应握手
router.post('/handshake/:id/respond', selfSession, asyncHandler(async (req: Request, res: Response) => {
  const alumniId = (req as any).selfAlumniId;
  const { accept } = req.body;
  if (typeof accept !== 'boolean') {
    throw new AppError('请指定接受或拒绝', 400, 'VALIDATION_ERROR');
  }

  const handshake = await selfService.respondHandshake(req.params.id, alumniId, accept);
  res.json({ success: true, data: handshake });
}));

// 获取收到的握手请求
router.get('/handshake/incoming', selfSession, asyncHandler(async (req: Request, res: Response) => {
  const alumniId = (req as any).selfAlumniId;
  const handshakes = await selfService.getIncomingHandshakes(alumniId);
  res.json({ success: true, data: handshakes });
}));

// 获取发出的握手请求
router.get('/handshake/outgoing', selfSession, asyncHandler(async (req: Request, res: Response) => {
  const alumniId = (req as any).selfAlumniId;
  const handshakes = await selfService.getOutgoingHandshakes(alumniId);
  res.json({ success: true, data: handshakes });
}));

export default router;

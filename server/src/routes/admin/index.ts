/**
 * Admin 路由汇总 — 替代原 admin.ts 巨型文件
 * 
 * 所有子路由共享 authMiddleware + requireAdmin 中间件
 * 每个子路由文件 ≤200 行
 */

import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../../middleware/auth';

// 子路由
import alumniRoutes from './alumni';
import messagesRoutes from './messages';
import distinguishedRoutes from './distinguished';
import photosRoutes from './photos';
import noticesRoutes from './notices';
import donationsRoutes from './donations';
import associationsRoutes from './associations';
import newsRoutes from './news';
import configRoutes from './config';
import statsRoutes from './stats';
import knowledgeRoutes from './knowledge';
import vintageRoutes from './vintage';
import classRostersRoutes from './classRosters';
import logsRoutes from './logs';
import videoGreetingsRoutes from './videoGreetings';
import interactionRoutes from './interaction';
import ragRoutes from './rag';
import activitiesRoutes from './activities';

const router: Router = Router();

// 所有管理路由需要管理员权限
router.use(authMiddleware, requireAdmin);

// 挂载子路由
router.use(alumniRoutes);
router.use(messagesRoutes);
router.use(distinguishedRoutes);
router.use(photosRoutes);
router.use(noticesRoutes);
router.use(donationsRoutes);
router.use(associationsRoutes);
router.use(newsRoutes);
router.use(configRoutes);
router.use(statsRoutes);
router.use(knowledgeRoutes);
router.use(vintageRoutes);
router.use(classRostersRoutes);
router.use(logsRoutes);
router.use(videoGreetingsRoutes);
router.use(interactionRoutes);
router.use(ragRoutes);
router.use(activitiesRoutes);

export default router;

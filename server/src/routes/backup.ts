import { Router, Response } from 'express';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth';
import { backupService } from '../services/backupService';
import { pool } from '../config/database';

const router: Router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 安全记录操作日志（跳过无效 UUID）
async function logOperation(
  userId: string | undefined,
  operationType: string,
  targetType: string,
  targetId: string | undefined,
  details: any
): Promise<void> {
  try {
    const validUserId = userId && UUID_REGEX.test(userId) ? userId : null;
    const validTargetId = targetId && UUID_REGEX.test(targetId) ? targetId : null;

    await pool.query(
      `INSERT INTO alumni_system.operation_logs (user_id, operation_type, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [validUserId, operationType, targetType, validTargetId, JSON.stringify(details)]
    );
  } catch (error) {
    console.warn('记录操作日志失败:', error);
  }
}
// 所有备份路由需要管理员权限
router.use(authMiddleware, requireAdmin);

/**
 * 获取备份文件列表
 */
router.get('/list', async (req: AuthRequest, res: Response) => {
  try {
    const backups = await backupService.getBackupList();
    res.json({ success: true, data: backups });
  } catch (error) {
    console.error('获取备份列表失败:', error);
    res.status(500).json({ success: false, message: '获取备份列表失败' });
  }
});

/**
 * 创建备份
 */
router.post('/create', async (req: AuthRequest, res: Response) => {
  try {
    const { description, includeFiles, includeDatabase } = req.body;

    const backup = await backupService.createBackup({
      description,
      includeFiles,
      includeDatabase,
    });

    await logOperation(
      req.userSession?.userId,
      'create',
      'backup',
      backup.id,
      { filename: backup.filename, description }
    );

    res.json({ success: true, data: backup });
  } catch (error: any) {
    console.error('创建备份失败:', error);
    res.status(500).json({ success: false, message: error.message || '创建备份失败' });
  }
});

/**
 * 从备份恢复
 */
router.post('/restore/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;

    // 验证文件名格式，防止路径遍历攻击
    if (!filename.match(/^backup_\d{8}_\d{6}\.tar\.gz$/)) {
      return res.status(400).json({ success: false, message: '无效的备份文件名' });
    }

    const result = await backupService.restoreFromBackup(filename);

    await logOperation(
      req.userSession?.userId,
      'restore',
      'backup',
      filename,
      { success: result.success, message: result.message }
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('恢复备份失败:', error);
    res.status(500).json({ success: false, message: error.message || '恢复备份失败' });
  }
});

/**
 * 下载备份文件
 */
router.get('/download/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;

    // 验证文件名格式
    if (!filename.match(/^backup_\d{8}_\d{6}\.tar\.gz$/)) {
      return res.status(400).json({ success: false, message: '无效的备份文件名' });
    }

    const filePath = backupService.getBackupPath(filename);

    // 检查文件是否存在
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: '备份文件不存在' });
    }

    // 记录下载操作
    await logOperation(
      req.userSession?.userId,
      'download',
      'backup',
      filename,
      { filename }
    );

    // 发送文件
    res.download(filePath);
  } catch (error: any) {
    console.error('下载备份失败:', error);
    res.status(500).json({ success: false, message: error.message || '下载备份失败' });
  }
});

/**
 * 删除备份文件
 */
router.delete('/:filename', async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.params;

    // 验证文件名格式
    if (!filename.match(/^backup_\d{8}_\d{6}\.tar\.gz$/)) {
      return res.status(400).json({ success: false, message: '无效的备份文件名' });
    }

    const success = backupService.deleteBackup(filename);

    if (success) {
      await logOperation(
        req.userSession?.userId,
        'delete',
        'backup',
        filename,
        { filename }
      );
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, message: '备份文件不存在' });
    }
  } catch (error: any) {
    console.error('删除备份失败:', error);
    res.status(500).json({ success: false, message: error.message || '删除备份失败' });
  }
});

/**
 * 上传备份文件
 */
router.post('/upload', async (req: AuthRequest, res: Response) => {
  try {
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');

    // 配置临时上传
    const storage = multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => {
        const uploadDir = path.resolve(process.cwd(), 'backups');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (_req: any, file: any, cb: any) => {
        // 保持原文件名
        cb(null, file.originalname);
      },
    });

    const upload = multer({
      storage,
      fileFilter: (_req: any, file: any, cb: any) => {
        // 只允许tar.gz文件
        if (file.originalname.endsWith('.tar.gz')) {
          cb(null, true);
        } else {
          cb(new Error('只允许.tar.gz格式的备份文件'));
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10GB
      },
    });

    // 处理单文件上传
    upload.single('backup')(req, res, async (err: any) => {
      if (err) {
        console.error('上传备份失败:', err);
        return res.status(400).json({ success: false, message: err.message || '上传失败' });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ success: false, message: '未选择文件' });
      }

      await logOperation(
        req.userSession?.userId,
        'upload',
        'backup',
        file.filename,
        { originalName: file.originalname, size: file.size }
      );

      res.json({
        success: true,
        data: {
          filename: file.filename,
          size: file.size,
          path: file.path,
        },
      });
    });
  } catch (error: any) {
    console.error('上传备份失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传备份失败' });
  }
});

export default router;

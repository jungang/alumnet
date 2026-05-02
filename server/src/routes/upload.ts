import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth';
import { fileUploadService } from '../services/fileUploadService';

const router: Router = Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(fileUploadService.getUploadDir(), 'temp'));
  },
  filename: (_req, file, cb) => {
    cb(null, fileUploadService.generateFilename(file.originalname));
  },
});

// 文件过滤器
const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (fileUploadService.getAllowedImageTypes().includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的图片格式: ${file.mimetype}`));
  }
};

// 创建multer实例
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: fileUploadService.getMaxImageSize(),
  },
});

// 确保临时目录存在
import fs from 'fs';
const tempDir = path.join(fileUploadService.getUploadDir(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 所有上传路由需要管理员权限
router.use(authMiddleware, requireAdmin);

/**
 * 单文件上传
 * POST /api/upload
 */
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }

    const { category = 'images' } = req.body;
    const result = await fileUploadService.saveImage(req.file, category);

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('文件上传失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/**
 * 多文件上传
 * POST /api/upload/multiple
 */
router.post('/multiple', upload.array('files', 10), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }

    const { category = 'images' } = req.body;
    const results = await fileUploadService.saveImages(files, category);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: files.length,
          success: successCount,
          failed: failedCount,
        },
      },
    });
  } catch (error: any) {
    console.error('批量上传失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/**
 * 毕业照上传
 * POST /api/upload/photo
 */
router.post('/photo', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的照片' });
    }

    const result = await fileUploadService.saveImage(req.file, 'photos');

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('照片上传失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/**
 * 老物件图片上传
 * POST /api/upload/vintage
 */
router.post('/vintage', upload.array('files', 5), async (req: AuthRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要上传的图片' });
    }

    const results = await fileUploadService.saveImages(files, 'vintage');
    const urls = results.filter(r => r.success).map(r => r.url);

    res.json({
      success: true,
      data: {
        urls,
        results,
      },
    });
  } catch (error: any) {
    console.error('老物件图片上传失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/**
 * 删除文件
 * DELETE /api/upload
 */
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: '请提供文件URL' });
    }

    const success = await fileUploadService.deleteFile(url);
    if (success) {
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, message: '文件不存在' });
    }
  } catch (error: any) {
    console.error('删除文件失败:', error);
    res.status(500).json({ success: false, message: error.message || '删除失败' });
  }
});

export default router;

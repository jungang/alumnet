import path from 'path';
import fs from 'fs';
import { UploadResult } from '../types/models';

// 允许的文件类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// 文件大小限制（字节）
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

// 上传目录
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

/**
 * 文件上传服务
 */
class FileUploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), UPLOAD_DIR);
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  private ensureUploadDir(): void {
    const dirs = ['images', 'documents', 'photos', 'vintage', 'temp'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  /**
   * 验证图片文件
   */
  validateImage(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return { valid: false, error: `不支持的图片格式: ${file.mimetype}，支持: jpg, png, gif, webp` };
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { valid: false, error: `图片大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大: 10MB` };
    }
    return { valid: true };
  }

  /**
   * 验证文档文件
   */
  validateDocument(file: Express.Multer.File): { valid: boolean; error?: string } {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      return { valid: false, error: `不支持的文档格式: ${file.mimetype}` };
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
      return { valid: false, error: `文档大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大: 50MB` };
    }
    return { valid: true };
  }

  /**
   * 生成唯一文件名
   */
  generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}${ext}`;
  }

  /**
   * 保存上传的图片
   */
  async saveImage(file: Express.Multer.File, subDir: string = 'images'): Promise<UploadResult> {
    const validation = this.validateImage(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const filename = this.generateFilename(file.originalname);
      const targetDir = path.join(this.uploadDir, subDir);
      const targetPath = path.join(targetDir, filename);

      // 确保目录存在
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 移动文件（multer已保存到临时位置）
      if (file.path) {
        fs.renameSync(file.path, targetPath);
      } else if (file.buffer) {
        fs.writeFileSync(targetPath, file.buffer);
      }

      // 返回相对URL
      const url = `/uploads/${subDir}/${filename}`;
      return { success: true, url, filename, size: file.size };
    } catch (error: any) {
      console.error('保存图片失败:', error);
      return { success: false, error: error.message || '保存图片失败' };
    }
  }

  /**
   * 批量保存图片
   */
  async saveImages(files: Express.Multer.File[], subDir: string = 'images'): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await this.saveImage(file, subDir);
      results.push(result);
    }
    return results;
  }

  /**
   * 删除文件
   */
  async deleteFile(url: string): Promise<boolean> {
    try {
      // 从URL提取文件路径
      const relativePath = url.replace(/^\/uploads\//, '');
      const fullPath = path.join(this.uploadDir, relativePath);
      
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('删除文件失败:', error);
      return false;
    }
  }

  /**
   * 获取上传目录路径
   */
  getUploadDir(): string {
    return this.uploadDir;
  }

  /**
   * 获取允许的图片类型
   */
  getAllowedImageTypes(): string[] {
    return ALLOWED_IMAGE_TYPES;
  }

  /**
   * 获取最大图片大小
   */
  getMaxImageSize(): number {
    return MAX_IMAGE_SIZE;
  }
}

export const fileUploadService = new FileUploadService();

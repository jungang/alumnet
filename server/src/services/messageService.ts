import { messageRepository, MessageSearchCriteria } from '../repositories/messageRepository';
import { 
  MessageStatus, 
  ListResponse, 
  BatchReviewRequest,
  MessageCategory,
  MessageDetailWithCategory,
  MessageCategoryStats,
  MessageCreateData
} from '../types/models';
import path from 'path';

// 验证常量
const VALID_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const VALID_CATEGORIES: MessageCategory[] = ['school', 'teacher', 'classmate'];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class MessageService {
  /**
   * 验证留言内容（非空、非纯空白）
   */
  validateContent(content: string): ValidationResult {
    if (!content || content.trim().length === 0) {
      return { valid: false, error: '留言内容不能为空' };
    }
    return { valid: true };
  }

  /**
   * 验证留言分类
   */
  validateCategory(category: string): ValidationResult {
    if (!VALID_CATEGORIES.includes(category as MessageCategory)) {
      return { 
        valid: false, 
        error: `无效的留言分类: ${category}。有效分类: ${VALID_CATEGORIES.join(', ')}` 
      };
    }
    return { valid: true };
  }

  /**
   * 验证图片格式
   */
  validateImageFormat(filename: string): ValidationResult {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    if (!VALID_IMAGE_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `不支持的图片格式: ${ext}。仅支持 ${VALID_IMAGE_FORMATS.join(', ')} 格式`,
      };
    }
    return { valid: true };
  }

  /**
   * 验证图片大小
   */
  validateImageSize(sizeBytes: number): ValidationResult {
    if (sizeBytes <= 0) {
      return { valid: false, error: '图片文件大小无效' };
    }
    if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `图片文件不能超过${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`,
      };
    }
    return { valid: true };
  }

  /**
   * 创建留言
   */
  async create(data: MessageCreateData): Promise<MessageDetailWithCategory> {
    // 验证内容
    const contentValidation = this.validateContent(data.content);
    if (!contentValidation.valid) {
      throw new Error(contentValidation.error);
    }

    // 验证分类
    const categoryValidation = this.validateCategory(data.category);
    if (!categoryValidation.valid) {
      throw new Error(categoryValidation.error);
    }

    return messageRepository.create({
      ...data,
      content: data.content.trim(),
    });
  }

  /**
   * 获取公开留言列表（按分类）
   */
  async getPublicList(
    category?: MessageCategory, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<ListResponse<MessageDetailWithCategory>> {
    return messageRepository.findPublicByCategory(category, page, pageSize);
  }

  /**
   * 获取分类统计
   */
  async getCategoryStats(): Promise<MessageCategoryStats[]> {
    return messageRepository.getCategoryStats();
  }

  /**
   * 管理端：获取留言列表
   */
  async getList(criteria: MessageSearchCriteria): Promise<ListResponse<MessageDetailWithCategory>> {
    return messageRepository.findAll(criteria);
  }

  /**
   * 获取留言详情
   */
  async getById(id: string): Promise<MessageDetailWithCategory | null> {
    return messageRepository.findById(id);
  }

  /**
   * 更新留言状态
   */
  async updateStatus(
    id: string, 
    status: MessageStatus, 
    reviewedBy?: string,
    rejectionReason?: string
  ): Promise<MessageDetailWithCategory | null> {
    const existing = await messageRepository.findById(id);
    if (!existing) throw new Error('留言不存在');
    return messageRepository.updateStatus(id, status, reviewedBy, rejectionReason);
  }

  /**
   * 批量审核
   */
  async batchReview(request: BatchReviewRequest, reviewedBy?: string): Promise<number> {
    if (!request.ids || request.ids.length === 0) {
      throw new Error('请选择要审核的留言');
    }
    return messageRepository.batchReview(request, reviewedBy);
  }

  /**
   * 删除留言
   */
  async delete(id: string): Promise<boolean> {
    const existing = await messageRepository.findById(id);
    if (!existing) throw new Error('留言不存在');
    return messageRepository.delete(id);
  }

  /**
   * 获取留言统计
   */
  async getStats() {
    return messageRepository.getStats();
  }
}

export const messageService = new MessageService();


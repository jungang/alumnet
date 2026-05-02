import { videoGreetingRepository, VideoGreetingSearchCriteria } from '../repositories/videoGreetingRepository';
import { VideoGreeting, VideoGreetingStatus, VideoUploadData, ListResponse } from '../types/models';
import path from 'path';

// 验证常量
const VALID_VIDEO_FORMATS = ['mp4', 'webm'];
const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
}

export class VideoGreetingService {
  /**
   * 验证视频格式
   */
  validateVideoFormat(filename: string): VideoValidationResult {
    const ext = path.extname(filename).toLowerCase().replace('.', '');
    if (!VALID_VIDEO_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `不支持的视频格式: ${ext}。仅支持 ${VALID_VIDEO_FORMATS.join(', ')} 格式`,
      };
    }
    return { valid: true };
  }

  /**
   * 验证视频时长
   */
  validateVideoDuration(durationSeconds: number): VideoValidationResult {
    if (durationSeconds <= 0) {
      return { valid: false, error: '视频时长必须大于0秒' };
    }
    if (durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      return {
        valid: false,
        error: `视频时长不能超过${MAX_VIDEO_DURATION_SECONDS}秒，当前时长: ${durationSeconds}秒`,
      };
    }
    return { valid: true };
  }

  /**
   * 验证视频大小
   */
  validateVideoSize(sizeBytes: number): VideoValidationResult {
    if (sizeBytes <= 0) {
      return { valid: false, error: '视频文件大小无效' };
    }
    if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
      return {
        valid: false,
        error: `视频文件不能超过${MAX_VIDEO_SIZE_BYTES / 1024 / 1024}MB`,
      };
    }
    return { valid: true };
  }

  /**
   * 获取公开视频列表（已审核通过的）
   */
  async getPublicList(page: number = 1, pageSize: number = 20): Promise<ListResponse<VideoGreeting>> {
    return videoGreetingRepository.findPublic(page, pageSize);
  }

  /**
   * 获取精选视频
   */
  async getFeatured(limit: number = 5): Promise<VideoGreeting[]> {
    return videoGreetingRepository.findFeatured(limit);
  }

  /**
   * 获取视频详情
   */
  async getById(id: string): Promise<VideoGreeting | null> {
    return videoGreetingRepository.findById(id);
  }

  /**
   * 上传视频寄语
   */
  async upload(
    data: VideoUploadData,
    videoUrl: string,
    thumbnailUrl?: string,
    durationSeconds?: number
  ): Promise<VideoGreeting> {
    // 验证必填字段
    if (!data.alumniName?.trim()) {
      throw new Error('校友姓名不能为空');
    }
    if (!data.title?.trim()) {
      throw new Error('视频标题不能为空');
    }
    if (!videoUrl?.trim()) {
      throw new Error('视频URL不能为空');
    }

    // 验证时长（如果提供）
    if (durationSeconds !== undefined) {
      const durationValidation = this.validateVideoDuration(durationSeconds);
      if (!durationValidation.valid) {
        throw new Error(durationValidation.error);
      }
    }

    return videoGreetingRepository.create({
      alumniId: data.alumniId,
      alumniName: data.alumniName.trim(),
      alumniClass: data.alumniClass?.trim(),
      title: data.title.trim(),
      description: data.description?.trim(),
      videoUrl,
      thumbnailUrl,
      durationSeconds,
    });
  }

  /**
   * 增加观看次数
   */
  async incrementViewCount(id: string): Promise<void> {
    const video = await videoGreetingRepository.findById(id);
    if (!video) {
      throw new Error('视频不存在');
    }
    await videoGreetingRepository.incrementViewCount(id);
  }

  /**
   * 管理端：获取视频列表
   */
  async getList(criteria: VideoGreetingSearchCriteria): Promise<ListResponse<VideoGreeting>> {
    return videoGreetingRepository.findAll(criteria);
  }

  /**
   * 管理端：更新视频状态
   */
  async updateStatus(
    id: string,
    status: VideoGreetingStatus,
    rejectionReason?: string,
    reviewedBy?: string
  ): Promise<VideoGreeting | null> {
    const video = await videoGreetingRepository.findById(id);
    if (!video) {
      throw new Error('视频不存在');
    }

    // 如果是拒绝，必须提供原因
    if (status === 'rejected' && !rejectionReason?.trim()) {
      throw new Error('拒绝视频时必须提供原因');
    }

    return videoGreetingRepository.updateStatus(id, status, rejectionReason, reviewedBy);
  }

  /**
   * 管理端：设置/取消精选
   */
  async setFeatured(id: string, featured: boolean): Promise<VideoGreeting | null> {
    const video = await videoGreetingRepository.findById(id);
    if (!video) {
      throw new Error('视频不存在');
    }

    // 只有已审核通过的视频才能设为精选
    if (featured && video.status !== 'approved' && video.status !== 'featured') {
      throw new Error('只有已审核通过的视频才能设为精选');
    }

    return videoGreetingRepository.setFeatured(id, featured);
  }

  /**
   * 管理端：删除视频
   */
  async delete(id: string): Promise<boolean> {
    const video = await videoGreetingRepository.findById(id);
    if (!video) {
      throw new Error('视频不存在');
    }
    return videoGreetingRepository.delete(id);
  }

  /**
   * 获取视频统计
   */
  async getStats() {
    return videoGreetingRepository.getStats();
  }
}

export const videoGreetingService = new VideoGreetingService();


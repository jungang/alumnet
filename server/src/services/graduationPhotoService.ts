import { 
  graduationPhotoRepository, 
  PhotoSearchCriteria 
} from '../repositories/graduationPhotoRepository';
import { GraduationPhoto, FaceTag, ListResponse } from '../types/models';

export class GraduationPhotoService {
  // 获取毕业照列表
  async getList(criteria: PhotoSearchCriteria): Promise<ListResponse<GraduationPhoto>> {
    return graduationPhotoRepository.findAll(criteria);
  }

  // 获取毕业照详情
  async getById(id: string): Promise<GraduationPhoto | null> {
    return graduationPhotoRepository.findById(id);
  }

  // 创建毕业照
  async create(data: {
    year: number;
    className?: string;
    originalUrl: string;
    restoredUrl?: string;
    faceTags?: FaceTag[];
  }): Promise<GraduationPhoto> {
    if (!data.year || !data.originalUrl) {
      throw new Error('年份和图片URL不能为空');
    }
    return graduationPhotoRepository.create(data);
  }

  // 更新毕业照
  async update(id: string, data: {
    year?: number;
    className?: string;
    originalUrl?: string;
    restoredUrl?: string;
  }): Promise<GraduationPhoto | null> {
    const existing = await graduationPhotoRepository.findById(id);
    if (!existing) {
      throw new Error('毕业照不存在');
    }
    return graduationPhotoRepository.update(id, data);
  }

  // 更新人脸标记
  async updateFaceTags(id: string, faceTags: FaceTag[]): Promise<GraduationPhoto | null> {
    const existing = await graduationPhotoRepository.findById(id);
    if (!existing) {
      throw new Error('毕业照不存在');
    }
    return graduationPhotoRepository.updateFaceTags(id, faceTags);
  }

  // 删除毕业照
  async delete(id: string): Promise<boolean> {
    const existing = await graduationPhotoRepository.findById(id);
    if (!existing) {
      throw new Error('毕业照不存在');
    }
    return graduationPhotoRepository.delete(id);
  }

  // 获取筛选选项
  async getFilterOptions(): Promise<{ years: number[]; classes: string[] }> {
    const [years, classes] = await Promise.all([
      graduationPhotoRepository.getDistinctYears(),
      graduationPhotoRepository.getDistinctClasses(),
    ]);
    return { years, classes };
  }
}

export const graduationPhotoService = new GraduationPhotoService();

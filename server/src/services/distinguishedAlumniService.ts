import { 
  distinguishedAlumniRepository, 
  DistinguishedAlumniWithInfo, 
  DistinguishedSearchCriteria 
} from '../repositories/distinguishedAlumniRepository';
import { alumniRepository } from '../repositories/alumniRepository';
import { TimelineEvent, ListResponse } from '../types/models';

export class DistinguishedAlumniService {
  // 获取杰出校友列表
  async getList(criteria: DistinguishedSearchCriteria): Promise<ListResponse<DistinguishedAlumniWithInfo>> {
    return distinguishedAlumniRepository.findAll(criteria);
  }

  // 获取杰出校友详情
  async getById(id: string): Promise<DistinguishedAlumniWithInfo | null> {
    return distinguishedAlumniRepository.findById(id);
  }

  // 创建杰出校友
  async create(data: {
    alumniId: string;
    category: string;
    achievement?: string;
    videoUrl?: string;
    popularity?: number;
    timeline?: TimelineEvent[];
  }): Promise<DistinguishedAlumniWithInfo> {
    // 验证校友是否存在
    const alumni = await alumniRepository.findById(data.alumniId);
    if (!alumni) {
      throw new Error('校友不存在');
    }

    // 检查是否已是杰出校友
    const exists = await distinguishedAlumniRepository.existsByAlumniId(data.alumniId);
    if (exists) {
      throw new Error('该校友已是杰出校友');
    }

    return distinguishedAlumniRepository.create(data);
  }

  // 更新杰出校友
  async update(id: string, data: {
    category?: string;
    achievement?: string;
    videoUrl?: string;
    popularity?: number;
    timeline?: TimelineEvent[];
  }): Promise<DistinguishedAlumniWithInfo | null> {
    const existing = await distinguishedAlumniRepository.findById(id);
    if (!existing) {
      throw new Error('杰出校友记录不存在');
    }
    return distinguishedAlumniRepository.update(id, data);
  }

  // 删除杰出校友（保留基础校友信息）
  async delete(id: string): Promise<boolean> {
    const existing = await distinguishedAlumniRepository.findById(id);
    if (!existing) {
      throw new Error('杰出校友记录不存在');
    }
    return distinguishedAlumniRepository.delete(id);
  }

  // 获取所有类别
  async getCategories(): Promise<string[]> {
    return distinguishedAlumniRepository.getCategories();
  }
}

export const distinguishedAlumniService = new DistinguishedAlumniService();

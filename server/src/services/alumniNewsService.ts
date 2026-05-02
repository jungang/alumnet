import { alumniNewsRepository, NewsSearchCriteria } from '../repositories/alumniNewsRepository';
import { AlumniNews, ListResponse } from '../types/models';

export class AlumniNewsService {
  async getList(criteria: NewsSearchCriteria): Promise<ListResponse<AlumniNews>> {
    return alumniNewsRepository.findAll(criteria);
  }
  async getById(id: string): Promise<AlumniNews | null> {
    return alumniNewsRepository.findById(id);
  }
  async create(data: Partial<AlumniNews>): Promise<AlumniNews> {
    if (!data.title) throw new Error('标题不能为空');
    return alumniNewsRepository.create(data);
  }
  async update(id: string, data: Partial<AlumniNews>): Promise<AlumniNews | null> {
    const existing = await alumniNewsRepository.findById(id);
    if (!existing) throw new Error('校友动态不存在');
    return alumniNewsRepository.update(id, data);
  }
  async delete(id: string): Promise<boolean> {
    const existing = await alumniNewsRepository.findById(id);
    if (!existing) throw new Error('校友动态不存在');
    return alumniNewsRepository.delete(id);
  }
}

export const alumniNewsService = new AlumniNewsService();

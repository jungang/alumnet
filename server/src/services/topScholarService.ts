import { topScholarRepository } from '../repositories/topScholarRepository';
import { TopScholar, CreateTopScholarDto, UpdateTopScholarDto } from '../types/models';

export interface ValidationError {
  field: string;
  message: string;
}

export const topScholarService = {
  /**
   * 获取所有状元（按年份降序）
   */
  async getAll(): Promise<TopScholar[]> {
    return topScholarRepository.findAll();
  },

  /**
   * 分页获取状元列表
   */
  async getPaginated(params: {
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: TopScholar[]; total: number }> {
    return topScholarRepository.findPaginated(params);
  },

  /**
   * 根据ID获取状元
   */
  async getById(id: string): Promise<TopScholar | null> {
    return topScholarRepository.findById(id);
  },

  /**
   * 创建状元
   */
  async create(data: CreateTopScholarDto): Promise<{ scholar?: TopScholar; errors?: ValidationError[] }> {
    const errors = this.validateCreate(data);
    if (errors.length > 0) {
      return { errors };
    }
    const scholar = await topScholarRepository.create(data);
    return { scholar };
  },

  /**
   * 更新状元
   */
  async update(id: string, data: UpdateTopScholarDto): Promise<{ scholar?: TopScholar; errors?: ValidationError[] }> {
    const errors = this.validateUpdate(data);
    if (errors.length > 0) {
      return { errors };
    }
    const scholar = await topScholarRepository.update(id, data);
    if (!scholar) {
      return { errors: [{ field: 'id', message: '状元记录不存在' }] };
    }
    return { scholar };
  },


  /**
   * 删除状元（软删除）
   */
  async delete(id: string): Promise<boolean> {
    return topScholarRepository.delete(id);
  },

  /**
   * 验证创建数据
   */
  validateCreate(data: CreateTopScholarDto): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push({ field: 'name', message: '姓名不能为空' });
    }

    if (data.examYear === undefined || data.examYear === null) {
      errors.push({ field: 'examYear', message: '高考年份不能为空' });
    } else if (data.examYear < 1900 || data.examYear > 2100) {
      errors.push({ field: 'examYear', message: '高考年份无效' });
    }

    if (!data.rankDescription || data.rankDescription.trim() === '') {
      errors.push({ field: 'rankDescription', message: '排名描述不能为空' });
    }

    if (!data.university || data.university.trim() === '') {
      errors.push({ field: 'university', message: '录取院校不能为空' });
    }

    return errors;
  },

  /**
   * 验证更新数据
   */
  validateUpdate(data: UpdateTopScholarDto): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.name !== undefined && data.name.trim() === '') {
      errors.push({ field: 'name', message: '姓名不能为空' });
    }

    if (data.examYear !== undefined) {
      if (data.examYear < 1900 || data.examYear > 2100) {
        errors.push({ field: 'examYear', message: '高考年份无效' });
      }
    }

    if (data.rankDescription !== undefined && data.rankDescription.trim() === '') {
      errors.push({ field: 'rankDescription', message: '排名描述不能为空' });
    }

    return errors;
  },

  /**
   * 根据姓名查找状元
   */
  async findByName(name: string): Promise<TopScholar | null> {
    return topScholarRepository.findByName(name);
  },
};

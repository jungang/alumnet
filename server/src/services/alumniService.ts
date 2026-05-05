import { alumniRepository, SearchCriteria, PagedResult } from '../repositories/alumniRepository';
import { privacyService } from './privacyService';
import { Alumni, UserRole } from '../types/models';
import { withCache, cacheDel } from '../config/cache';

export class AlumniService {
  // 搜索校友（带隐私过滤 + 缓存）
  async search(
    criteria: SearchCriteria,
    viewerRole: UserRole,
    viewerClassName?: string
  ): Promise<PagedResult<Alumni>> {
    const cacheKey = `alumni:search:${JSON.stringify(criteria)}:${viewerRole}`;
    return withCache(cacheKey, async () => {
      const result = await alumniRepository.search(criteria);
      result.items = privacyService.filterSensitiveDataBatch(
        result.items, viewerRole, viewerClassName
      );
      return result;
    }, 120); // 2分钟缓存
  }

  // 获取校友详情（带隐私过滤）
  async getDetail(
    id: string,
    viewerRole: UserRole,
    viewerClassName?: string
  ): Promise<Alumni | null> {
    const alumni = await alumniRepository.findById(id);
    if (!alumni) return null;
    
    return privacyService.filterSensitiveData(alumni, viewerRole, viewerClassName);
  }

  // 获取推荐校友
  async getRecommendations(
    alumniId: string,
    viewerRole: UserRole,
    viewerClassName?: string
  ): Promise<Alumni[]> {
    const recommendations = await alumniRepository.getRecommendations(alumniId);
    return privacyService.filterSensitiveDataBatch(recommendations, viewerRole, viewerClassName);
  }

  // 获取同班同学
  async getClassmates(
    alumniId: string,
    viewerRole: UserRole,
    viewerClassName?: string
  ): Promise<Alumni[]> {
    const classmates = await alumniRepository.getClassmates(alumniId);
    return privacyService.filterSensitiveDataBatch(classmates, viewerRole, viewerClassName);
  }

  // 按年份区间筛选（纯函数，用于属性测试）
  filterByYearRange(alumni: Alumni[], yearStart: number, yearEnd: number): Alumni[] {
    return alumni.filter(a => a.graduationYear >= yearStart && a.graduationYear <= yearEnd);
  }

  // 按行业筛选（纯函数，用于属性测试）
  filterByIndustry(alumni: Alumni[], industry: string): Alumni[] {
    return alumni.filter(a => a.industry === industry);
  }

  // 按班级筛选（纯函数，用于属性测试）
  filterByClassName(alumni: Alumni[], className: string): Alumni[] {
    return alumni.filter(a => a.className === className);
  }

  // 组合筛选（纯函数，用于属性测试）
  filterByCriteria(alumni: Alumni[], criteria: SearchCriteria): Alumni[] {
    let result = [...alumni];

    if (criteria.keyword) {
      const keyword = criteria.keyword.toLowerCase();
      result = result.filter(a => 
        a.name.toLowerCase().includes(keyword) ||
        (a.studentId && a.studentId.toLowerCase().includes(keyword))
      );
    }

    if (criteria.yearStart !== undefined && criteria.yearEnd !== undefined) {
      result = this.filterByYearRange(result, criteria.yearStart, criteria.yearEnd);
    }

    if (criteria.industry) {
      result = this.filterByIndustry(result, criteria.industry);
    }

    if (criteria.className) {
      result = this.filterByClassName(result, criteria.className);
    }

    return result;
  }

  // 获取筛选选项
  async getFilterOptions(): Promise<{
    industries: string[];
    classes: string[];
    yearRange: { min: number; max: number };
  }> {
    return withCache('alumni:filterOptions', async () => {
      const [industries, classes, yearRange] = await Promise.all([
        alumniRepository.getIndustries(),
        alumniRepository.getClasses(),
        alumniRepository.getYearRange(),
      ]);
      return { industries, classes, yearRange };
    }, 600); // 10分钟缓存
  }
}

export const alumniService = new AlumniService();

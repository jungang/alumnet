import { searchNoticeRepository, NoticeSearchCriteria } from '../repositories/searchNoticeRepository';
import { 
  SearchNoticeStatus, 
  ListResponse,
  SearchNoticeExtended,
  SearchNoticeCreateData
} from '../types/models';

export class SearchNoticeService {
  /**
   * 获取公开寻人启事列表
   */
  async getPublicList(page: number = 1, pageSize: number = 20): Promise<ListResponse<SearchNoticeExtended>> {
    return searchNoticeRepository.findPublic(page, pageSize);
  }

  /**
   * 搜索寻人启事
   */
  async search(keyword: string, page: number = 1, pageSize: number = 20): Promise<ListResponse<SearchNoticeExtended>> {
    if (!keyword?.trim()) {
      return this.getPublicList(page, pageSize);
    }
    return searchNoticeRepository.search(keyword.trim(), page, pageSize);
  }

  /**
   * 创建寻人启事（需要验证校友身份）
   */
  async create(data: SearchNoticeCreateData, isVerifiedAlumni: boolean): Promise<SearchNoticeExtended> {
    if (!isVerifiedAlumni) {
      throw new Error('只有已验证的校友才能发布寻人启事');
    }

    if (!data.targetName?.trim()) {
      throw new Error('请填写要寻找的校友姓名');
    }

    if (!data.publisherId) {
      throw new Error('发布者ID不能为空');
    }

    return searchNoticeRepository.create({
      ...data,
      targetName: data.targetName.trim(),
      description: data.description?.trim() || '',
    });
  }

  /**
   * 管理端：获取寻人启事列表
   */
  async getList(criteria: NoticeSearchCriteria): Promise<ListResponse<SearchNoticeExtended>> {
    return searchNoticeRepository.findAll(criteria);
  }

  /**
   * 获取寻人启事详情
   */
  async getById(id: string): Promise<SearchNoticeExtended | null> {
    return searchNoticeRepository.findById(id);
  }

  /**
   * 更新寻人启事状态（可附带重逢故事）
   */
  async updateStatus(
    id: string, 
    status: SearchNoticeStatus,
    reunionStory?: string
  ): Promise<SearchNoticeExtended | null> {
    const existing = await searchNoticeRepository.findById(id);
    if (!existing) throw new Error('寻人启事不存在');
    return searchNoticeRepository.updateStatus(id, status, reunionStory);
  }

  /**
   * 删除寻人启事
   */
  async delete(id: string): Promise<boolean> {
    const existing = await searchNoticeRepository.findById(id);
    if (!existing) throw new Error('寻人启事不存在');
    return searchNoticeRepository.delete(id);
  }

  /**
   * 获取寻人启事统计
   */
  async getStats() {
    return searchNoticeRepository.getStats();
  }

  /**
   * 获取需要提醒的长期寻人启事
   */
  async getLongActiveNotices(daysThreshold: number = 365): Promise<SearchNoticeExtended[]> {
    return searchNoticeRepository.findLongActiveNotices(daysThreshold);
  }
}

export const searchNoticeService = new SearchNoticeService();


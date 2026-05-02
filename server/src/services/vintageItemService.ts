import { 
  vintageItemRepository, 
  VintageItemSearchCriteria 
} from '../repositories/vintageItemRepository';
import { VintageItem, VintageItemType, ListResponse } from '../types/models';

export class VintageItemService {
  // 获取老物件列表
  async getList(criteria: VintageItemSearchCriteria): Promise<ListResponse<VintageItem>> {
    return vintageItemRepository.findAll(criteria);
  }

  // 获取老物件详情
  async getById(id: string): Promise<VintageItem | null> {
    return vintageItemRepository.findById(id);
  }

  // 创建老物件
  async create(data: {
    name: string;
    itemType: VintageItemType;
    era?: string;
    description?: string;
    images?: string[];
    sortOrder?: number;
    donorName?: string;
    donorClass?: string;
  }): Promise<VintageItem> {
    // 验证必填字段
    if (!data.name || !data.name.trim()) {
      throw new Error('物品名称不能为空');
    }
    if (!data.itemType) {
      throw new Error('物品类型不能为空');
    }

    // 验证类型是否有效
    const validTypes: VintageItemType[] = [
      'admission_notice', 'diploma', 'badge', 'meal_ticket', 
      'textbook', 'photo', 'certificate', 'other'
    ];
    if (!validTypes.includes(data.itemType)) {
      throw new Error('无效的物品类型');
    }

    return vintageItemRepository.create(data);
  }

  // 更新老物件
  async update(id: string, data: {
    name?: string;
    itemType?: VintageItemType;
    era?: string;
    description?: string;
    images?: string[];
    sortOrder?: number;
    donorName?: string;
    donorClass?: string;
  }): Promise<VintageItem | null> {
    const existing = await vintageItemRepository.findById(id);
    if (!existing) {
      throw new Error('老物件不存在');
    }

    // 验证类型是否有效
    if (data.itemType) {
      const validTypes: VintageItemType[] = [
        'admission_notice', 'diploma', 'badge', 'meal_ticket', 
        'textbook', 'photo', 'certificate', 'other'
      ];
      if (!validTypes.includes(data.itemType)) {
        throw new Error('无效的物品类型');
      }
    }

    return vintageItemRepository.update(id, data);
  }

  // 删除老物件
  async delete(id: string): Promise<boolean> {
    const existing = await vintageItemRepository.findById(id);
    if (!existing) {
      throw new Error('老物件不存在');
    }
    return vintageItemRepository.delete(id);
  }

  // 获取筛选选项
  async getFilterOptions(): Promise<{ types: VintageItemType[]; eras: string[] }> {
    const [types, eras] = await Promise.all([
      vintageItemRepository.getTypes(),
      vintageItemRepository.getEras(),
    ]);
    return { types, eras };
  }

  // 获取统计信息
  async getStats(): Promise<{ type: VintageItemType; count: number }[]> {
    return vintageItemRepository.getStats();
  }
}

export const vintageItemService = new VintageItemService();

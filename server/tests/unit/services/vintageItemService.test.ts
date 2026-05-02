/**
 * VintageItemService 单元测试
 * 测试老物件管理功能
 */

import { describe, it, expect } from 'vitest';
import { InMemoryStore } from '../../generators';

type VintageItemType = 'admission_notice' | 'diploma' | 'badge' | 'meal_ticket' | 'textbook' | 'photo' | 'certificate' | 'other';

interface VintageItem {
  id: string;
  name: string;
  itemType: VintageItemType;
  era?: string;
  description?: string;
  images: string[];
  sortOrder: number;
  donorName?: string;
  donorClass?: string;
}

class InMemoryVintageStore extends InMemoryStore<VintageItem> {
  findByType(itemType: VintageItemType): VintageItem[] {
    return this.findAll().filter(item => item.itemType === itemType);
  }

  findByEra(era: string): VintageItem[] {
    return this.findAll().filter(item => item.era === era);
  }

  findSorted(): VintageItem[] {
    return this.findAll().sort((a, b) => a.sortOrder - b.sortOrder);
  }

  search(keyword: string): VintageItem[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.findAll().filter(item => 
      item.name.toLowerCase().includes(lowerKeyword) ||
      (item.description && item.description.toLowerCase().includes(lowerKeyword))
    );
  }
}

describe('VintageItemService - CRUD Operations', () => {
  it('should create a vintage item', () => {
    const store = new InMemoryVintageStore();
    
    const item = store.create({
      id: 'item-1',
      name: 'Old Textbook',
      itemType: 'textbook',
      era: '1980s',
      images: ['https://example.com/img1.jpg'],
      sortOrder: 1,
    });

    expect(item.id).toBe('item-1');
    expect(item.name).toBe('Old Textbook');
    expect(item.itemType).toBe('textbook');
  });

  it('should find item by id', () => {
    const store = new InMemoryVintageStore();
    
    store.create({
      id: 'item-1',
      name: 'Old Textbook',
      itemType: 'textbook',
      images: [],
      sortOrder: 1,
    });

    const found = store.findById('item-1');
    
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Old Textbook');
  });

  it('should update item', () => {
    const store = new InMemoryVintageStore();
    
    store.create({
      id: 'item-1',
      name: 'Old Textbook',
      itemType: 'textbook',
      images: [],
      sortOrder: 1,
    });

    store.update('item-1', { description: 'A vintage textbook from 1985' });
    const found = store.findById('item-1');
    
    expect(found?.description).toBe('A vintage textbook from 1985');
  });

  it('should delete item', () => {
    const store = new InMemoryVintageStore();
    
    store.create({
      id: 'item-1',
      name: 'Old Textbook',
      itemType: 'textbook',
      images: [],
      sortOrder: 1,
    });

    const deleted = store.delete('item-1');
    const found = store.findById('item-1');
    
    expect(deleted).toBe(true);
    expect(found).toBeNull();
  });
});

describe('VintageItemService - Query Operations', () => {
  it('should find items by type', () => {
    const store = new InMemoryVintageStore();
    
    store.create({ id: '1', name: 'Item 1', itemType: 'textbook', images: [], sortOrder: 1 });
    store.create({ id: '2', name: 'Item 2', itemType: 'badge', images: [], sortOrder: 2 });
    store.create({ id: '3', name: 'Item 3', itemType: 'textbook', images: [], sortOrder: 3 });

    const textbooks = store.findByType('textbook');
    
    expect(textbooks).toHaveLength(2);
    expect(textbooks.every(item => item.itemType === 'textbook')).toBe(true);
  });

  it('should find items by era', () => {
    const store = new InMemoryVintageStore();
    
    store.create({ id: '1', name: 'Item 1', itemType: 'textbook', era: '1980s', images: [], sortOrder: 1 });
    store.create({ id: '2', name: 'Item 2', itemType: 'badge', era: '1990s', images: [], sortOrder: 2 });
    store.create({ id: '3', name: 'Item 3', itemType: 'photo', era: '1980s', images: [], sortOrder: 3 });

    const items1980s = store.findByEra('1980s');
    
    expect(items1980s).toHaveLength(2);
    expect(items1980s.every(item => item.era === '1980s')).toBe(true);
  });

  it('should return items sorted by sortOrder', () => {
    const store = new InMemoryVintageStore();
    
    store.create({ id: '1', name: 'Item 1', itemType: 'textbook', images: [], sortOrder: 3 });
    store.create({ id: '2', name: 'Item 2', itemType: 'badge', images: [], sortOrder: 1 });
    store.create({ id: '3', name: 'Item 3', itemType: 'photo', images: [], sortOrder: 2 });

    const sorted = store.findSorted();
    
    expect(sorted[0].sortOrder).toBe(1);
    expect(sorted[1].sortOrder).toBe(2);
    expect(sorted[2].sortOrder).toBe(3);
  });

  it('should search items by keyword in name', () => {
    const store = new InMemoryVintageStore();
    
    store.create({ id: '1', name: 'Old Textbook', itemType: 'textbook', images: [], sortOrder: 1 });
    store.create({ id: '2', name: 'School Badge', itemType: 'badge', images: [], sortOrder: 2 });
    store.create({ id: '3', name: 'Vintage Photo', itemType: 'photo', images: [], sortOrder: 3 });

    const results = store.search('textbook');
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Old Textbook');
  });

  it('should search items by keyword in description', () => {
    const store = new InMemoryVintageStore();
    
    store.create({ 
      id: '1', 
      name: 'Item 1', 
      itemType: 'textbook', 
      description: 'A rare vintage textbook',
      images: [], 
      sortOrder: 1 
    });
    store.create({ 
      id: '2', 
      name: 'Item 2', 
      itemType: 'badge', 
      description: 'School badge from 1985',
      images: [], 
      sortOrder: 2 
    });

    const results = store.search('vintage');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('should search case-insensitively', () => {
    const store = new InMemoryVintageStore();
    
    store.create({ id: '1', name: 'Old TEXTBOOK', itemType: 'textbook', images: [], sortOrder: 1 });

    const results = store.search('textbook');
    
    expect(results).toHaveLength(1);
  });
});

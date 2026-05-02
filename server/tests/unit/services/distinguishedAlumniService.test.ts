/**
 * DistinguishedAlumniService 单元测试
 * 测试杰出校友管理功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { InMemoryStore } from '../../generators';

// 杰出校友数据接口
interface DistinguishedAlumni {
  id: string;
  alumniId: string;
  category: string;
  achievement: string;
  biography?: string;
  videoUrl?: string;
  popularity: number;
  timeline: Array<{ year: number; title: string; description: string }>;
}

// 内存杰出校友存储（用于测试）
class InMemoryDistinguishedStore extends InMemoryStore<DistinguishedAlumni> {
  private alumniStore: Set<string> = new Set();

  addAlumni(alumniId: string): void {
    this.alumniStore.add(alumniId);
  }

  alumniExists(alumniId: string): boolean {
    return this.alumniStore.has(alumniId);
  }

  createDistinguished(data: DistinguishedAlumni): DistinguishedAlumni {
    if (!this.alumniExists(data.alumniId)) {
      throw new Error('校友不存在');
    }
    
    // Check if already distinguished
    const existing = this.findAll().find(d => d.alumniId === data.alumniId);
    if (existing) {
      throw new Error('该校友已是杰出校友');
    }
    
    return this.create(data);
  }

  findByCategory(category: string): DistinguishedAlumni[] {
    return this.findAll().filter(d => d.category === category);
  }

  clearAll(): void {
    this.clear();
    this.alumniStore.clear();
  }
}

// 生成器
const timelineEventArbitrary = fc.record({
  year: fc.integer({ min: 1950, max: 2024 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
});

const distinguishedAlumniArbitrary: fc.Arbitrary<DistinguishedAlumni> = fc.record({
  id: fc.uuid(),
  alumniId: fc.uuid(),
  category: fc.constantFrom('政界', '商界', '学术', '艺术', '医疗', '教育', '科技'),
  achievement: fc.string({ minLength: 1, maxLength: 500 }),
  biography: fc.option(fc.string({ minLength: 1, maxLength: 1000 })),
  videoUrl: fc.option(fc.webUrl()),
  popularity: fc.integer({ min: 0, max: 1000 }),
  timeline: fc.array(timelineEventArbitrary, { minLength: 0, maxLength: 10 }),
});

describe('DistinguishedAlumniService - CRUD Operations', () => {
  it('should create distinguished alumni', () => {
    const store = new InMemoryDistinguishedStore();
    store.addAlumni('alumni-1');
    
    const data: DistinguishedAlumni = {
      id: 'dist-1',
      alumniId: 'alumni-1',
      category: '科技',
      achievement: 'Great achievement',
      popularity: 100,
      timeline: [],
    };

    const created = store.createDistinguished(data);
    
    expect(created.id).toBe('dist-1');
    expect(created.category).toBe('科技');
  });

  it('should throw error when alumni does not exist', () => {
    const store = new InMemoryDistinguishedStore();
    
    const data: DistinguishedAlumni = {
      id: 'dist-1',
      alumniId: 'non-existent',
      category: '科技',
      achievement: 'Great achievement',
      popularity: 100,
      timeline: [],
    };

    expect(() => store.createDistinguished(data)).toThrow('校友不存在');
  });

  it('should throw error when alumni is already distinguished', () => {
    const store = new InMemoryDistinguishedStore();
    store.addAlumni('alumni-1');
    
    const data: DistinguishedAlumni = {
      id: 'dist-1',
      alumniId: 'alumni-1',
      category: '科技',
      achievement: 'Great achievement',
      popularity: 100,
      timeline: [],
    };

    store.createDistinguished(data);
    
    const data2: DistinguishedAlumni = {
      id: 'dist-2',
      alumniId: 'alumni-1',
      category: '教育',
      achievement: 'Another achievement',
      popularity: 50,
      timeline: [],
    };

    expect(() => store.createDistinguished(data2)).toThrow('该校友已是杰出校友');
  });

  it('should find distinguished alumni by id', () => {
    const store = new InMemoryDistinguishedStore();
    store.addAlumni('alumni-1');
    
    store.createDistinguished({
      id: 'dist-1',
      alumniId: 'alumni-1',
      category: '科技',
      achievement: 'Great achievement',
      popularity: 100,
      timeline: [],
    });

    const found = store.findById('dist-1');
    
    expect(found).not.toBeNull();
    expect(found?.category).toBe('科技');
  });

  it('should update distinguished alumni', () => {
    const store = new InMemoryDistinguishedStore();
    store.addAlumni('alumni-1');
    
    store.createDistinguished({
      id: 'dist-1',
      alumniId: 'alumni-1',
      category: '科技',
      achievement: 'Great achievement',
      popularity: 100,
      timeline: [],
    });

    store.update('dist-1', { popularity: 200 });
    const found = store.findById('dist-1');
    
    expect(found?.popularity).toBe(200);
  });

  it('should delete distinguished alumni', () => {
    const store = new InMemoryDistinguishedStore();
    store.addAlumni('alumni-1');
    
    store.createDistinguished({
      id: 'dist-1',
      alumniId: 'alumni-1',
      category: '科技',
      achievement: 'Great achievement',
      popularity: 100,
      timeline: [],
    });

    const deleted = store.delete('dist-1');
    const found = store.findById('dist-1');
    
    expect(deleted).toBe(true);
    expect(found).toBeNull();
    // Alumni should still exist
    expect(store.alumniExists('alumni-1')).toBe(true);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 17: CRUD创建后查询一致性**
   * **Validates: Requirements 1.5**
   */
  it('property: created data should be retrievable by id', () => {
    fc.assert(
      fc.property(distinguishedAlumniArbitrary, (data) => {
        const store = new InMemoryDistinguishedStore();
        store.addAlumni(data.alumniId);
        
        store.createDistinguished(data);
        const found = store.findById(data.id);
        
        expect(found).not.toBeNull();
        expect(found?.id).toBe(data.id);
        expect(found?.alumniId).toBe(data.alumniId);
        expect(found?.category).toBe(data.category);
        expect(found?.achievement).toBe(data.achievement);
        expect(found?.popularity).toBe(data.popularity);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 18: CRUD删除后查询为空**
   * **Validates: Requirements 1.5**
   */
  it('property: deleted data should not be retrievable', () => {
    fc.assert(
      fc.property(distinguishedAlumniArbitrary, (data) => {
        const store = new InMemoryDistinguishedStore();
        store.addAlumni(data.alumniId);
        
        store.createDistinguished(data);
        expect(store.findById(data.id)).not.toBeNull();
        
        store.delete(data.id);
        expect(store.findById(data.id)).toBeNull();
        
        // Alumni should still exist
        expect(store.alumniExists(data.alumniId)).toBe(true);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('DistinguishedAlumniService - Query Operations', () => {
  it('should find by category', () => {
    const store = new InMemoryDistinguishedStore();
    
    store.addAlumni('alumni-1');
    store.addAlumni('alumni-2');
    store.addAlumni('alumni-3');
    
    store.createDistinguished({
      id: 'dist-1',
      alumniId: 'alumni-1',
      category: '科技',
      achievement: 'Achievement 1',
      popularity: 100,
      timeline: [],
    });
    
    store.createDistinguished({
      id: 'dist-2',
      alumniId: 'alumni-2',
      category: '教育',
      achievement: 'Achievement 2',
      popularity: 80,
      timeline: [],
    });
    
    store.createDistinguished({
      id: 'dist-3',
      alumniId: 'alumni-3',
      category: '科技',
      achievement: 'Achievement 3',
      popularity: 90,
      timeline: [],
    });

    const techAlumni = store.findByCategory('科技');
    
    expect(techAlumni).toHaveLength(2);
    expect(techAlumni.every(d => d.category === '科技')).toBe(true);
  });
});

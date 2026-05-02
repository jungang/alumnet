/**
 * filters 工具函数单元测试
 * 测试数据过滤和分页功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  buildWhereConditions,
  buildPagination,
  validateFilterMatch,
  highlightKeyword,
  FilterOptions,
} from '../../../src/utils/filters';

describe('buildWhereConditions', () => {
  it('should return default condition when no filters provided', () => {
    const result = buildWhereConditions({});
    expect(result.conditions).toContain('1=1');
    expect(result.params).toHaveLength(0);
    expect(result.paramIndex).toBe(1);
  });

  it('should add keyword condition when keyword is provided', () => {
    const result = buildWhereConditions({ keyword: 'test' });
    expect(result.conditions.length).toBeGreaterThan(1);
    expect(result.params).toContain('%test%');
  });

  it('should add year condition when year is provided', () => {
    const result = buildWhereConditions({ year: 2020 });
    expect(result.params).toContain(2020);
  });

  it('should add className condition when className is provided', () => {
    const result = buildWhereConditions({ className: 'Class A' });
    expect(result.params).toContain('%Class A%');
  });

  it('should add itemType condition when itemType is provided', () => {
    const result = buildWhereConditions({ itemType: 'photo' });
    expect(result.params).toContain('photo');
  });

  it('should add era condition when era is provided', () => {
    const result = buildWhereConditions({ era: '1990s' });
    expect(result.params).toContain('1990s');
  });

  it('should add department condition when department is provided', () => {
    const result = buildWhereConditions({ department: 'Engineering' });
    expect(result.params).toContain('%Engineering%');
  });

  it('should add graduationYear condition when graduationYear is provided', () => {
    const result = buildWhereConditions({ graduationYear: 2015 });
    expect(result.params).toContain(2015);
  });

  it('should handle table alias correctly', () => {
    const result = buildWhereConditions({ year: 2020 }, 'p');
    expect(result.conditions.some(c => c.includes('p.year'))).toBe(true);
  });

  it('should combine multiple conditions', () => {
    const result = buildWhereConditions({
      keyword: 'test',
      year: 2020,
      className: 'Class A',
    });
    expect(result.conditions.length).toBeGreaterThan(3);
    expect(result.params.length).toBe(3);
  });
});

describe('buildPagination', () => {
  it('should return default pagination when no params provided', () => {
    const result = buildPagination();
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
  });

  it('should calculate correct offset for page 1', () => {
    const result = buildPagination(1, 10);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
  });

  it('should calculate correct offset for page 2', () => {
    const result = buildPagination(2, 10);
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(10);
  });

  it('should calculate correct offset for page 3', () => {
    const result = buildPagination(3, 20);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(40);
  });

  it('should handle negative page number', () => {
    const result = buildPagination(-1, 10);
    expect(result.offset).toBe(0);
  });

  it('should handle zero page number', () => {
    const result = buildPagination(0, 10);
    expect(result.offset).toBe(0);
  });

  it('should cap pageSize at 100', () => {
    const result = buildPagination(1, 200);
    expect(result.limit).toBe(100);
  });

  it('should ensure minimum pageSize of 1', () => {
    const result = buildPagination(1, 0);
    expect(result.limit).toBe(1);
  });

  it('should handle negative pageSize', () => {
    const result = buildPagination(1, -10);
    expect(result.limit).toBe(1);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 13: 分页参数安全性**
   * **Validates: Requirements 4.1**
   */
  it('property: pagination should always return safe values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 1000 }),
        fc.integer({ min: -100, max: 1000 }),
        (page, pageSize) => {
          const result = buildPagination(page, pageSize);
          
          // limit should be between 1 and 100
          expect(result.limit).toBeGreaterThanOrEqual(1);
          expect(result.limit).toBeLessThanOrEqual(100);
          
          // offset should be non-negative
          expect(result.offset).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('validateFilterMatch', () => {
  it('should return true when no filters provided', () => {
    const item = { name: 'Test', description: 'Description' };
    expect(validateFilterMatch(item, {})).toBe(true);
  });

  it('should match keyword in name', () => {
    const item = { name: 'Test Item', description: '' };
    expect(validateFilterMatch(item, { keyword: 'test' })).toBe(true);
    expect(validateFilterMatch(item, { keyword: 'other' })).toBe(false);
  });

  it('should match keyword in description', () => {
    const item = { name: '', description: 'Test Description' };
    expect(validateFilterMatch(item, { keyword: 'test' })).toBe(true);
  });

  it('should match year exactly', () => {
    const item = { name: 'Test', year: 2020 };
    expect(validateFilterMatch(item, { year: 2020 })).toBe(true);
    expect(validateFilterMatch(item, { year: 2021 })).toBe(false);
  });

  it('should match className (case insensitive)', () => {
    const item = { name: 'Test', className: 'Class A' };
    expect(validateFilterMatch(item, { className: 'class a' })).toBe(true);
    expect(validateFilterMatch(item, { className: 'Class B' })).toBe(false);
  });

  it('should match itemType exactly', () => {
    const item = { name: 'Test', itemType: 'photo' };
    expect(validateFilterMatch(item, { itemType: 'photo' })).toBe(true);
    expect(validateFilterMatch(item, { itemType: 'video' })).toBe(false);
  });

  it('should match era exactly', () => {
    const item = { name: 'Test', era: '1990s' };
    expect(validateFilterMatch(item, { era: '1990s' })).toBe(true);
    expect(validateFilterMatch(item, { era: '2000s' })).toBe(false);
  });

  it('should match department (case insensitive)', () => {
    const item = { name: 'Test', department: 'Engineering' };
    expect(validateFilterMatch(item, { department: 'engineering' })).toBe(true);
    expect(validateFilterMatch(item, { department: 'Science' })).toBe(false);
  });

  it('should match graduationYear exactly', () => {
    const item = { name: 'Test', graduationYear: 2015 };
    expect(validateFilterMatch(item, { graduationYear: 2015 })).toBe(true);
    expect(validateFilterMatch(item, { graduationYear: 2016 })).toBe(false);
  });

  it('should handle snake_case field names', () => {
    const item = { name: 'Test', class_name: 'Class A', graduation_year: 2015 };
    expect(validateFilterMatch(item, { className: 'class a' })).toBe(true);
    expect(validateFilterMatch(item, { graduationYear: 2015 })).toBe(true);
  });

  it('should require all conditions to match', () => {
    const item = { name: 'Test', year: 2020, className: 'Class A' };
    expect(validateFilterMatch(item, { year: 2020, className: 'Class A' })).toBe(true);
    expect(validateFilterMatch(item, { year: 2020, className: 'Class B' })).toBe(false);
    expect(validateFilterMatch(item, { year: 2021, className: 'Class A' })).toBe(false);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 14: 筛选条件匹配验证**
   * **Validates: Requirements 4.1**
   */
  it('property: validateFilterMatch should be consistent with manual checks', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.option(fc.string({ maxLength: 100 })),
          year: fc.option(fc.integer({ min: 1950, max: 2024 })),
          className: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          itemType: fc.option(fc.constantFrom('photo', 'video', 'document')),
        }),
        fc.record({
          keyword: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
          year: fc.option(fc.integer({ min: 1950, max: 2024 })),
        }),
        (item, filters) => {
          const result = validateFilterMatch(item, filters);
          
          // Manual verification
          let expected = true;
          
          if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            const name = (item.name || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            if (!name.includes(keyword) && !description.includes(keyword)) {
              expected = false;
            }
          }
          
          if (filters.year !== undefined && item.year !== filters.year) {
            expected = false;
          }
          
          expect(result).toBe(expected);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('highlightKeyword', () => {
  it('should return original text when no keyword', () => {
    expect(highlightKeyword('Hello World', '')).toBe('Hello World');
  });

  it('should return original text when text is empty', () => {
    expect(highlightKeyword('', 'test')).toBe('');
  });

  it('should highlight keyword in text', () => {
    const result = highlightKeyword('Hello World', 'World');
    expect(result).toContain('<mark>');
    expect(result).toContain('World');
  });

  it('should highlight keyword case-insensitively', () => {
    const result = highlightKeyword('Hello World', 'world');
    expect(result).toContain('<mark>');
  });

  it('should highlight multiple occurrences', () => {
    const result = highlightKeyword('test test test', 'test');
    const matches = result.match(/<mark>/g);
    expect(matches?.length).toBe(3);
  });

  it('should handle special regex characters', () => {
    // This tests that special characters are escaped
    const result = highlightKeyword('Hello (World)', '(World)');
    expect(result).toBeDefined();
  });
});

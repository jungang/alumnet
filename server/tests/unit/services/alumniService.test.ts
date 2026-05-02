/**
 * AlumniService 单元测试
 * 测试校友查询和筛选功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AlumniService } from '../../../src/services/alumniService';
import { Alumni } from '../../../src/types/models';
import { alumniArbitrary, industryArbitrary } from '../../generators';

const alumniService = new AlumniService();

// 创建测试用校友数据
const createAlumni = (overrides: Partial<Alumni> = {}): Alumni => ({
  id: 'test-id',
  name: 'Test User',
  graduationYear: 2020,
  className: 'Class A',
  phoneVisibility: 'public',
  emailVisibility: 'public',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('filterByYearRange', () => {
  it('should return alumni within year range', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', graduationYear: 2018 }),
      createAlumni({ id: '2', graduationYear: 2020 }),
      createAlumni({ id: '3', graduationYear: 2022 }),
    ];

    const result = alumniService.filterByYearRange(alumni, 2019, 2021);
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('should include boundary years', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', graduationYear: 2019 }),
      createAlumni({ id: '2', graduationYear: 2021 }),
    ];

    const result = alumniService.filterByYearRange(alumni, 2019, 2021);
    
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no matches', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', graduationYear: 2010 }),
    ];

    const result = alumniService.filterByYearRange(alumni, 2020, 2025);
    
    expect(result).toHaveLength(0);
  });

  it('should handle empty input', () => {
    const result = alumniService.filterByYearRange([], 2020, 2025);
    expect(result).toHaveLength(0);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 1: 年份区间筛选正确性**
   * **Validates: Requirements 1.1, 8.1**
   */
  it('property: all results should be within year range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1950, max: 2024 }),
        fc.integer({ min: 1950, max: 2024 }),
        fc.array(alumniArbitrary, { minLength: 0, maxLength: 50 }),
        (year1, year2, alumni) => {
          const [min, max] = [Math.min(year1, year2), Math.max(year1, year2)];
          const result = alumniService.filterByYearRange(alumni as Alumni[], min, max);
          
          return result.every(a => a.graduationYear >= min && a.graduationYear <= max);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('filterByIndustry', () => {
  it('should return alumni with matching industry', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', industry: '科技' }),
      createAlumni({ id: '2', industry: '教育' }),
      createAlumni({ id: '3', industry: '科技' }),
    ];

    const result = alumniService.filterByIndustry(alumni, '科技');
    
    expect(result).toHaveLength(2);
    expect(result.every(a => a.industry === '科技')).toBe(true);
  });

  it('should return empty array when no matches', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', industry: '科技' }),
    ];

    const result = alumniService.filterByIndustry(alumni, '医疗');
    
    expect(result).toHaveLength(0);
  });

  it('should handle alumni without industry', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', industry: undefined }),
      createAlumni({ id: '2', industry: '科技' }),
    ];

    const result = alumniService.filterByIndustry(alumni, '科技');
    
    expect(result).toHaveLength(1);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 2: 行业筛选正确性**
   * **Validates: Requirements 1.1, 8.2**
   */
  it('property: all results should have matching industry', () => {
    fc.assert(
      fc.property(
        industryArbitrary,
        fc.array(alumniArbitrary, { minLength: 0, maxLength: 50 }),
        (industry, alumni) => {
          const result = alumniService.filterByIndustry(alumni as Alumni[], industry);
          return result.every(a => a.industry === industry);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('filterByClassName', () => {
  it('should return alumni with matching class name', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', className: 'Class A' }),
      createAlumni({ id: '2', className: 'Class B' }),
      createAlumni({ id: '3', className: 'Class A' }),
    ];

    const result = alumniService.filterByClassName(alumni, 'Class A');
    
    expect(result).toHaveLength(2);
    expect(result.every(a => a.className === 'Class A')).toBe(true);
  });

  it('should return empty array when no matches', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', className: 'Class A' }),
    ];

    const result = alumniService.filterByClassName(alumni, 'Class C');
    
    expect(result).toHaveLength(0);
  });

  it('property: all results should have matching class name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.array(alumniArbitrary, { minLength: 0, maxLength: 50 }),
        (className, alumni) => {
          const result = alumniService.filterByClassName(alumni as Alumni[], className);
          return result.every(a => a.className === className);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('filterByCriteria', () => {
  it('should filter by keyword in name', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', name: 'John Doe' }),
      createAlumni({ id: '2', name: 'Jane Smith' }),
    ];

    const result = alumniService.filterByCriteria(alumni, { keyword: 'john' });
    
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John Doe');
  });

  it('should filter by keyword in studentId', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', name: 'User 1', studentId: 'STU001' }),
      createAlumni({ id: '2', name: 'User 2', studentId: 'STU002' }),
    ];

    const result = alumniService.filterByCriteria(alumni, { keyword: 'stu001' });
    
    expect(result).toHaveLength(1);
  });

  it('should combine year range and industry filters', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', graduationYear: 2020, industry: '科技' }),
      createAlumni({ id: '2', graduationYear: 2020, industry: '教育' }),
      createAlumni({ id: '3', graduationYear: 2015, industry: '科技' }),
    ];

    const result = alumniService.filterByCriteria(alumni, {
      yearStart: 2018,
      yearEnd: 2022,
      industry: '科技',
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('should combine all filters', () => {
    const alumni: Alumni[] = [
      createAlumni({ id: '1', name: 'John', graduationYear: 2020, industry: '科技', className: 'Class A' }),
      createAlumni({ id: '2', name: 'John', graduationYear: 2020, industry: '科技', className: 'Class B' }),
      createAlumni({ id: '3', name: 'Jane', graduationYear: 2020, industry: '科技', className: 'Class A' }),
    ];

    const result = alumniService.filterByCriteria(alumni, {
      keyword: 'john',
      yearStart: 2019,
      yearEnd: 2021,
      industry: '科技',
      className: 'Class A',
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 3: 组合筛选交集一致性**
   * **Validates: Requirements 1.1, 8.3**
   */
  it('property: combined filter should equal intersection of individual filters', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1950, max: 2024 }),
        fc.integer({ min: 1950, max: 2024 }),
        industryArbitrary,
        fc.array(alumniArbitrary, { minLength: 0, maxLength: 50 }),
        (year1, year2, industry, alumni) => {
          const [yearStart, yearEnd] = [Math.min(year1, year2), Math.max(year1, year2)];
          
          // Combined filter
          const combinedResult = alumniService.filterByCriteria(alumni as Alumni[], {
            yearStart,
            yearEnd,
            industry,
          });

          // Individual filters then intersection
          const yearFiltered = alumniService.filterByYearRange(alumni as Alumni[], yearStart, yearEnd);
          const industryFiltered = alumniService.filterByIndustry(alumni as Alumni[], industry);
          const intersection = yearFiltered.filter(a => industryFiltered.some(b => b.id === a.id));

          // Results should match
          expect(combinedResult.length).toBe(intersection.length);
          expect(combinedResult.every(a => intersection.some(b => b.id === a.id))).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

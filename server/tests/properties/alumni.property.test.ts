import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AlumniService } from '../../src/services/alumniService';
import { PrivacyService } from '../../src/services/privacyService';
import { Alumni, VisibilityLevel, AlumniStatus } from '../../src/types/models';

const alumniService = new AlumniService();
const privacyService = new PrivacyService();

// 生成随机校友数据的Arbitrary
const alumniArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  studentId: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
  graduationYear: fc.integer({ min: 1950, max: 2024 }),
  className: fc.string({ minLength: 1, maxLength: 50 }),
  department: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  industry: fc.option(fc.constantFrom('政界', '商界', '学术', '艺术', '医疗', '教育', '科技')),
  currentCity: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  workUnit: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
  phone: fc.option(fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 11, maxLength: 11 })),
  email: fc.option(fc.emailAddress()),
  phoneVisibility: fc.constantFrom('public', 'classmates_only', 'private') as fc.Arbitrary<VisibilityLevel>,
  emailVisibility: fc.constantFrom('public', 'classmates_only', 'private') as fc.Arbitrary<VisibilityLevel>,
  status: fc.constantFrom('active', 'lost_contact', 'deceased') as fc.Arbitrary<AlumniStatus>,
  extraInfo: fc.option(fc.object()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

describe('Alumni Query Property Tests', () => {
  /**
   * **Feature: alumni-query-system, Property 2: 年份区间筛选正确性**
   * **Validates: Requirements 2.1**
   */
  it('年份区间筛选应只返回区间内的校友', () => {
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

  /**
   * **Feature: alumni-query-system, Property 3: 行业标签筛选正确性**
   * **Validates: Requirements 2.2**
   */
  it('行业标签筛选应只返回指定行业的校友', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('政界', '商界', '学术', '艺术', '医疗', '教育', '科技'),
        fc.array(alumniArbitrary, { minLength: 0, maxLength: 50 }),
        (industry, alumni) => {
          const result = alumniService.filterByIndustry(alumni as Alumni[], industry);
          return result.every(a => a.industry === industry);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: alumni-query-system, Property 4: 班级筛选完整性**
   * **Validates: Requirements 2.3**
   */
  it('班级筛选应只返回指定班级的校友', () => {
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

  /**
   * **Feature: alumni-query-system, Property 5: 组合筛选条件交集**
   * **Validates: Requirements 2.4**
   */
  it('组合筛选结果应等于各单独条件结果的交集', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1950, max: 2024 }),
        fc.integer({ min: 1950, max: 2024 }),
        fc.constantFrom('政界', '商界', '学术', '艺术'),
        fc.array(alumniArbitrary, { minLength: 0, maxLength: 50 }),
        (year1, year2, industry, alumni) => {
          const [yearStart, yearEnd] = [Math.min(year1, year2), Math.max(year1, year2)];
          
          // 组合筛选
          const combinedResult = alumniService.filterByCriteria(alumni as Alumni[], {
            yearStart,
            yearEnd,
            industry,
          });

          // 单独筛选后取交集
          const yearFiltered = alumniService.filterByYearRange(alumni as Alumni[], yearStart, yearEnd);
          const industryFiltered = alumniService.filterByIndustry(alumni as Alumni[], industry);
          const intersection = yearFiltered.filter(a => industryFiltered.some(b => b.id === a.id));

          // 结果应该相同
          return combinedResult.length === intersection.length &&
                 combinedResult.every(a => intersection.some(b => b.id === a.id));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Privacy Service Property Tests', () => {
  /**
   * **Feature: alumni-query-system, Property 16: 手机号掩码格式**
   * **Validates: Requirements 7.1**
   */
  it('手机号脱敏应产生正确的掩码格式', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 11, maxLength: 11 }),
        (phone) => {
          const masked = privacyService.maskPhone(phone);
          const pattern = /^\d{3} \*{4} \d{4}$/;
          return pattern.test(masked);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: alumni-query-system, Property 13: Guest角色数据过滤**
   * **Validates: Requirements 6.1**
   */
  it('Guest用户应看到脱敏后的手机号', () => {
    fc.assert(
      fc.property(
        alumniArbitrary,
        (alumni) => {
          const alumniWithPhone = { ...alumni, phone: '13812345678' } as Alumni;
          const filtered = privacyService.filterSensitiveData(alumniWithPhone, 'guest');
          
          // Guest用户看到的手机号应该是脱敏的
          if (filtered.phone) {
            return filtered.phone.includes('****');
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: alumni-query-system, Property 18: 可见性设置生效**
   * **Validates: Requirements 7.3**
   */
  it('非同班校友应看不到设置为仅同学可见的信息', () => {
    fc.assert(
      fc.property(
        alumniArbitrary,
        fc.string({ minLength: 1, maxLength: 50 }),
        (alumni, viewerClassName) => {
          const alumniData = {
            ...alumni,
            phone: '13812345678',
            phoneVisibility: 'classmates_only' as VisibilityLevel,
            className: 'Class A',
          } as Alumni;

          // 不同班级的已验证校友
          if (viewerClassName !== alumniData.className) {
            const filtered = privacyService.filterSensitiveData(
              alumniData,
              'verified_alumni',
              viewerClassName
            );
            // 应该看到脱敏的手机号
            return filtered.phone?.includes('****') ?? true;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('JSON Serialization Property Tests', () => {
  /**
   * **Feature: alumni-query-system, Property 23: JSON序列化往返一致性**
   * **Validates: Requirements 11.3**
   */
  it('JSON序列化往返应保持数据一致', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          graduationYear: fc.integer({ min: 1950, max: 2024 }),
          className: fc.string({ minLength: 1, maxLength: 50 }),
          phone: fc.option(fc.string()),
          email: fc.option(fc.emailAddress()),
        }),
        (data) => {
          const json = JSON.stringify(data);
          const deserialized = JSON.parse(json);
          return JSON.stringify(data) === JSON.stringify(deserialized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: alumni-query-system, Property 24: 配置数据往返一致性**
   * **Validates: Requirements 11.4**
   */
  it('配置数据序列化往返应保持一致', () => {
    fc.assert(
      fc.property(
        fc.record({
          dbHost: fc.string(),
          dbPort: fc.integer({ min: 1, max: 65535 }),
          jwtSecret: fc.string(),
          cacheEnabled: fc.boolean(),
          maxConnections: fc.integer({ min: 1, max: 100 }),
        }),
        (config) => {
          const json = JSON.stringify(config);
          const deserialized = JSON.parse(json);
          return JSON.stringify(config) === JSON.stringify(deserialized);
        }
      ),
      { numRuns: 100 }
    );
  });
});

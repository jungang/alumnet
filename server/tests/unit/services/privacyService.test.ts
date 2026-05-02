/**
 * PrivacyService 单元测试
 * 测试数据脱敏和隐私控制功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PrivacyService } from '../../../src/services/privacyService';
import { Alumni, VisibilityLevel } from '../../../src/types/models';
import { alumniArbitrary, phoneArbitrary } from '../../generators';

const privacyService = new PrivacyService();

describe('maskPhone', () => {
  it('should mask phone number correctly', () => {
    expect(privacyService.maskPhone('13812345678')).toBe('138 **** 5678');
  });

  it('should return original if phone is too short', () => {
    expect(privacyService.maskPhone('123456')).toBe('123456');
  });

  it('should return original if phone is empty', () => {
    expect(privacyService.maskPhone('')).toBe('');
  });

  it('should handle null/undefined gracefully', () => {
    expect(privacyService.maskPhone(null as any)).toBeFalsy();
    expect(privacyService.maskPhone(undefined as any)).toBeFalsy();
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 4: 手机号脱敏格式正确性**
   * **Validates: Requirements 1.3, 8.4**
   */
  it('property: masked phone should have correct format', () => {
    fc.assert(
      fc.property(phoneArbitrary, (phone) => {
        const masked = privacyService.maskPhone(phone);
        const pattern = /^\d{3} \*{4} \d{4}$/;
        expect(pattern.test(masked)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('property: masked phone should preserve first 3 and last 4 digits', () => {
    fc.assert(
      fc.property(phoneArbitrary, (phone) => {
        const masked = privacyService.maskPhone(phone);
        const prefix = phone.slice(0, 3);
        const suffix = phone.slice(-4);
        
        expect(masked.startsWith(prefix)).toBe(true);
        expect(masked.endsWith(suffix)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('maskEmail', () => {
  it('should mask email correctly', () => {
    expect(privacyService.maskEmail('test@example.com')).toBe('t***t@example.com');
  });

  it('should handle short local part', () => {
    expect(privacyService.maskEmail('ab@example.com')).toBe('**@example.com');
  });

  it('should return original if no @ symbol', () => {
    expect(privacyService.maskEmail('invalid-email')).toBe('invalid-email');
  });

  it('should return original if empty', () => {
    expect(privacyService.maskEmail('')).toBe('');
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 5: 邮箱脱敏格式正确性**
   * **Validates: Requirements 1.3**
   */
  it('property: masked email should contain @ and domain', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const masked = privacyService.maskEmail(email);
        const domain = email.split('@')[1];
        
        expect(masked).toContain('@');
        expect(masked).toContain(domain);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('filterSensitiveData', () => {
  const createAlumni = (overrides: Partial<Alumni> = {}): Alumni => ({
    id: 'test-id',
    name: 'Test User',
    graduationYear: 2020,
    className: 'Class A',
    phone: '13812345678',
    email: 'test@example.com',
    phoneVisibility: 'public',
    emailVisibility: 'public',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('Guest role', () => {
    it('should mask phone for guest', () => {
      const alumni = createAlumni();
      const filtered = privacyService.filterSensitiveData(alumni, 'guest');
      
      expect(filtered.phone).toContain('****');
    });

    it('should mask email for guest', () => {
      const alumni = createAlumni();
      const filtered = privacyService.filterSensitiveData(alumni, 'guest');
      
      expect(filtered.email).toContain('***');
    });

    /**
     * **Feature: comprehensive-unit-testing, Property 8: Guest用户数据脱敏**
     * **Validates: Requirements 1.3**
     */
    it('property: guest should always see masked data', () => {
      fc.assert(
        fc.property(alumniArbitrary, (alumni) => {
          const alumniWithData = {
            ...alumni,
            phone: '13812345678',
            email: 'test@example.com',
          } as Alumni;
          
          const filtered = privacyService.filterSensitiveData(alumniWithData, 'guest');
          
          if (filtered.phone) {
            expect(filtered.phone).toContain('****');
          }
          if (filtered.email) {
            expect(filtered.email).toContain('***');
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Verified alumni role', () => {
    it('should show public phone to verified alumni', () => {
      const alumni = createAlumni({ phoneVisibility: 'public' });
      const filtered = privacyService.filterSensitiveData(alumni, 'verified_alumni', 'Class B');
      
      expect(filtered.phone).toBe('13812345678');
    });

    it('should mask private phone for verified alumni', () => {
      const alumni = createAlumni({ phoneVisibility: 'private' });
      const filtered = privacyService.filterSensitiveData(alumni, 'verified_alumni', 'Class B');
      
      expect(filtered.phone).toContain('****');
    });

    it('should show classmates_only phone to same class', () => {
      const alumni = createAlumni({ phoneVisibility: 'classmates_only' });
      const filtered = privacyService.filterSensitiveData(alumni, 'verified_alumni', 'Class A');
      
      expect(filtered.phone).toBe('13812345678');
    });

    it('should mask classmates_only phone for different class', () => {
      const alumni = createAlumni({ phoneVisibility: 'classmates_only' });
      const filtered = privacyService.filterSensitiveData(alumni, 'verified_alumni', 'Class B');
      
      expect(filtered.phone).toContain('****');
    });

    /**
     * **Feature: comprehensive-unit-testing, Property 9: 可见性设置生效**
     * **Validates: Requirements 1.3**
     */
    it('property: classmates_only should be masked for different class', () => {
      fc.assert(
        fc.property(
          alumniArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          (alumni, viewerClassName) => {
            const alumniData = {
              ...alumni,
              phone: '13812345678',
              phoneVisibility: 'classmates_only' as VisibilityLevel,
              className: 'Fixed Class Name',
            } as Alumni;

            if (viewerClassName !== alumniData.className) {
              const filtered = privacyService.filterSensitiveData(
                alumniData,
                'verified_alumni',
                viewerClassName
              );
              expect(filtered.phone).toContain('****');
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Admin role', () => {
    it('should show all data to admin regardless of visibility', () => {
      const alumni = createAlumni({
        phoneVisibility: 'private',
        emailVisibility: 'private',
      });
      const filtered = privacyService.filterSensitiveData(alumni, 'admin');
      
      expect(filtered.phone).toBe('13812345678');
      expect(filtered.email).toBe('test@example.com');
    });
  });
});

describe('filterSensitiveDataBatch', () => {
  it('should filter all items in batch', () => {
    const alumni: Alumni[] = [
      {
        id: '1',
        name: 'User 1',
        graduationYear: 2020,
        className: 'Class A',
        phone: '13811111111',
        email: 'user1@example.com',
        phoneVisibility: 'public',
        emailVisibility: 'public',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'User 2',
        graduationYear: 2021,
        className: 'Class B',
        phone: '13822222222',
        email: 'user2@example.com',
        phoneVisibility: 'public',
        emailVisibility: 'public',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const filtered = privacyService.filterSensitiveDataBatch(alumni, 'guest');
    
    expect(filtered).toHaveLength(2);
    expect(filtered[0].phone).toContain('****');
    expect(filtered[1].phone).toContain('****');
  });

  it('should return empty array for empty input', () => {
    const filtered = privacyService.filterSensitiveDataBatch([], 'guest');
    expect(filtered).toHaveLength(0);
  });
});

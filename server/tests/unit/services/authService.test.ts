/**
 * AuthService 单元测试
 * 测试认证和授权功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AuthService } from '../../../src/services/authService';
import { UserRole } from '../../../src/types/models';

// 创建新的AuthService实例用于测试
const authService = new AuthService();

describe('generateToken and verifyToken', () => {
  it('should generate a valid JWT token', () => {
    const payload = { userId: 'user-123', role: 'admin' as UserRole };
    const token = authService.generateToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should verify a valid token and return payload', () => {
    const payload = { userId: 'user-123', role: 'admin' as UserRole };
    const token = authService.generateToken(payload);
    const verified = authService.verifyToken(token);
    
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('user-123');
    expect(verified?.role).toBe('admin');
  });

  it('should return null for invalid token', () => {
    const verified = authService.verifyToken('invalid-token');
    expect(verified).toBeNull();
  });

  it('should return null for malformed token', () => {
    const verified = authService.verifyToken('not.a.valid.jwt.token');
    expect(verified).toBeNull();
  });

  it('should return null for empty token', () => {
    const verified = authService.verifyToken('');
    expect(verified).toBeNull();
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 6: JWT往返一致性**
   * **Validates: Requirements 1.2, 8.5**
   */
  it('property: token round trip should preserve payload data', () => {
    fc.assert(
      fc.property(
        fc.record({
          userId: fc.option(fc.uuid()),
          role: fc.constantFrom('guest', 'verified_alumni', 'admin') as fc.Arbitrary<UserRole>,
          alumniId: fc.option(fc.uuid()),
          className: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        }),
        (payload) => {
          const token = authService.generateToken(payload);
          const verified = authService.verifyToken(token);
          
          expect(verified).not.toBeNull();
          expect(verified?.role).toBe(payload.role);
          
          if (payload.userId) {
            expect(verified?.userId).toBe(payload.userId);
          }
          if (payload.alumniId) {
            expect(verified?.alumniId).toBe(payload.alumniId);
          }
          if (payload.className) {
            expect(verified?.className).toBe(payload.className);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('hasPermission', () => {
  it('should return true when role equals required role', () => {
    expect(authService.hasPermission('admin', 'admin')).toBe(true);
    expect(authService.hasPermission('verified_alumni', 'verified_alumni')).toBe(true);
    expect(authService.hasPermission('guest', 'guest')).toBe(true);
  });

  it('should return true when role is higher than required', () => {
    expect(authService.hasPermission('admin', 'verified_alumni')).toBe(true);
    expect(authService.hasPermission('admin', 'guest')).toBe(true);
    expect(authService.hasPermission('verified_alumni', 'guest')).toBe(true);
  });

  it('should return false when role is lower than required', () => {
    expect(authService.hasPermission('guest', 'admin')).toBe(false);
    expect(authService.hasPermission('guest', 'verified_alumni')).toBe(false);
    expect(authService.hasPermission('verified_alumni', 'admin')).toBe(false);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 7: 权限层级正确性**
   * **Validates: Requirements 1.2**
   */
  it('property: role hierarchy should be consistent', () => {
    const roles: UserRole[] = ['guest', 'verified_alumni', 'admin'];
    const roleHierarchy: Record<UserRole, number> = {
      guest: 0,
      verified_alumni: 1,
      admin: 2,
    };

    fc.assert(
      fc.property(
        fc.constantFrom(...roles),
        fc.constantFrom(...roles),
        (role, requiredRole) => {
          const hasPermission = authService.hasPermission(role, requiredRole);
          const expected = roleHierarchy[role] >= roleHierarchy[requiredRole];
          
          expect(hasPermission).toBe(expected);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('property: admin should have all permissions', () => {
    const roles: UserRole[] = ['guest', 'verified_alumni', 'admin'];
    
    roles.forEach(requiredRole => {
      expect(authService.hasPermission('admin', requiredRole)).toBe(true);
    });
  });

  it('property: guest should only have guest permission', () => {
    expect(authService.hasPermission('guest', 'guest')).toBe(true);
    expect(authService.hasPermission('guest', 'verified_alumni')).toBe(false);
    expect(authService.hasPermission('guest', 'admin')).toBe(false);
  });
});

describe('getGuestSession', () => {
  it('should return guest session', () => {
    const session = authService.getGuestSession();
    
    expect(session).toEqual({ role: 'guest' });
  });

  it('should always return the same structure', () => {
    const session1 = authService.getGuestSession();
    const session2 = authService.getGuestSession();
    
    expect(session1).toEqual(session2);
  });
});

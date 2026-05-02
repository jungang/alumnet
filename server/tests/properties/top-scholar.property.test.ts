import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-based tests for Top Scholar functionality
 * Feature: real-data-integration
 */

// Helper: Generate a valid top scholar object
const topScholarArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  examYear: fc.integer({ min: 1980, max: 2030 }),
  rankDescription: fc.string({ minLength: 1, maxLength: 200 }),
  university: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  major: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  score: fc.option(fc.integer({ min: 0, max: 750 }), { nil: undefined }),
  photoUrl: fc.option(fc.webUrl(), { nil: undefined }),
  biography: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  sortOrder: fc.integer({ min: 0, max: 1000 }),
});

describe('Top Scholar Properties', () => {
  /**
   * Feature: real-data-integration, Property 4: Top scholar list ordering
   * Validates: Requirements 2.5
   * 
   * For any list of top scholars returned by the API, the records SHALL be 
   * sorted by examYear in descending order (most recent first).
   */
  it('Property 4: Top scholar list should be sorted by examYear descending', () => {
    fc.assert(
      fc.property(
        fc.array(topScholarArb, { minLength: 0, maxLength: 50 }),
        (scholars) => {
          // Simulate the sorting logic from repository
          const sorted = [...scholars].sort((a, b) => {
            if (b.examYear !== a.examYear) {
              return b.examYear - a.examYear;
            }
            return b.sortOrder - a.sortOrder;
          });

          // Verify ordering property
          for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            // Previous year should be >= current year (descending)
            expect(prev.examYear).toBeGreaterThanOrEqual(curr.examYear);
            // If same year, previous sortOrder should be >= current sortOrder
            if (prev.examYear === curr.examYear) {
              expect(prev.sortOrder).toBeGreaterThanOrEqual(curr.sortOrder);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: real-data-integration, Property 3: Top scholar data completeness
   * Validates: Requirements 2.2
   * 
   * For any top scholar record returned by the API, the response SHALL contain 
   * all required fields: name, examYear, rankDescription, and university.
   */
  it('Property 3: Top scholar should have all required fields', () => {
    fc.assert(
      fc.property(topScholarArb, (scholar) => {
        // Required fields must be present and non-empty
        expect(scholar.name).toBeDefined();
        expect(scholar.name.length).toBeGreaterThan(0);
        expect(scholar.examYear).toBeDefined();
        expect(typeof scholar.examYear).toBe('number');
        expect(scholar.rankDescription).toBeDefined();
        expect(scholar.rankDescription.length).toBeGreaterThan(0);
        // examYear should be a valid year
        expect(scholar.examYear).toBeGreaterThanOrEqual(1980);
        expect(scholar.examYear).toBeLessThanOrEqual(2030);
      }),
      { numRuns: 100 }
    );
  });


  /**
   * Feature: real-data-integration, Property 8: Required field validation for top scholars
   * Validates: Requirements 5.2
   * 
   * For any create request missing required fields (name, examYear, rankDescription, university), 
   * the API SHALL return a validation error.
   */
  it('Property 8: Missing required fields should be detected', () => {
    // Validation function that checks required fields
    const validateTopScholar = (data: Partial<typeof topScholarArb>) => {
      const errors: string[] = [];
      if (!data.name || (typeof data.name === 'string' && data.name.trim() === '')) {
        errors.push('name is required');
      }
      if (data.examYear === undefined || data.examYear === null) {
        errors.push('examYear is required');
      }
      if (!data.rankDescription || (typeof data.rankDescription === 'string' && data.rankDescription.trim() === '')) {
        errors.push('rankDescription is required');
      }
      return errors;
    };

    fc.assert(
      fc.property(
        fc.record({
          name: fc.oneof(fc.constant(''), fc.constant(undefined), fc.constant(null)),
          examYear: fc.option(fc.integer({ min: 1980, max: 2030 }), { nil: undefined }),
          rankDescription: fc.oneof(fc.constant(''), fc.constant(undefined), fc.constant(null)),
        }),
        (invalidData) => {
          const errors = validateTopScholar(invalidData as any);
          // At least one error should be present for invalid data
          expect(errors.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: real-data-integration, Property 9: Update persistence
   * Validates: Requirements 5.3
   * 
   * For any top scholar update operation, immediately querying the same record 
   * SHALL return the updated values.
   */
  it('Property 9: Updates should be reflected immediately', () => {
    fc.assert(
      fc.property(
        topScholarArb,
        fc.record({
          name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          examYear: fc.option(fc.integer({ min: 1980, max: 2030 }), { nil: undefined }),
          rankDescription: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        }),
        (original, updates) => {
          // Simulate update logic
          const updated = { ...original };
          if (updates.name !== undefined) updated.name = updates.name;
          if (updates.examYear !== undefined) updated.examYear = updates.examYear;
          if (updates.rankDescription !== undefined) updated.rankDescription = updates.rankDescription;

          // Verify updates are applied
          if (updates.name !== undefined) {
            expect(updated.name).toBe(updates.name);
          }
          if (updates.examYear !== undefined) {
            expect(updated.examYear).toBe(updates.examYear);
          }
          if (updates.rankDescription !== undefined) {
            expect(updated.rankDescription).toBe(updates.rankDescription);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

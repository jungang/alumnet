/**
 * Property-Based Tests for HomeView Layout
 * 
 * **Feature: responsive-orientation, Property 1: Orientation-based grid column consistency (HomeView)**
 * **Validates: Requirements 1.1, 1.2**
 * 
 * Tests that the home page grid columns match expected count for each orientation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { setActivePinia, createPinia } from 'pinia';
import { useOrientationStore } from '@/stores/orientation';

// Mock window object for testing
function mockWindow(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(orientation: portrait)' ? height > width : width >= height,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('HomeView Grid Layout Properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  /**
   * Property 1: Orientation-based grid column consistency (HomeView)
   * For any screen dimensions:
   * - Portrait mode (height > width): grid should have 2 columns
   * - Landscape mode (width >= height): grid should have 5 columns
   */
  it('should provide correct home grid columns based on orientation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // width
        fc.integer({ min: 320, max: 2560 }), // height
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const isPortrait = height > width;
          const expectedCols = isPortrait ? 2 : 5;
          
          expect(store.homeGridCols).toBe(expectedCols);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Home grid columns are always valid values
   * Grid columns should only be 2 (portrait) or 5 (landscape)
   */
  it('should only produce valid grid column values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const validValues = [2, 5];
          expect(validValues).toContain(store.homeGridCols);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Portrait mode always has fewer columns than landscape
   */
  it('should have fewer columns in portrait than landscape', () => {
    // Test with same total pixels but different orientations
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 1200 }), // smaller dimension
        fc.integer({ min: 1201, max: 2560 }), // larger dimension
        (smaller, larger) => {
          // Portrait: smaller width, larger height
          mockWindow(smaller, larger);
          const store1 = useOrientationStore();
          store1.updateOrientation();
          const portraitCols = store1.homeGridCols;
          
          // Landscape: larger width, smaller height
          mockWindow(larger, smaller);
          const store2 = useOrientationStore();
          store2.updateOrientation();
          const landscapeCols = store2.homeGridCols;
          
          expect(portraitCols).toBeLessThan(landscapeCols);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('HomeView Layout Edge Cases', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should use 5 columns for typical landscape iPad (1024x768)', () => {
    mockWindow(1024, 768);
    const store = useOrientationStore();
    store.updateOrientation();
    
    expect(store.homeGridCols).toBe(5);
  });

  it('should use 2 columns for typical portrait iPad (768x1024)', () => {
    mockWindow(768, 1024);
    const store = useOrientationStore();
    store.updateOrientation();
    
    expect(store.homeGridCols).toBe(2);
  });

  it('should use 2 columns for vertical kiosk (1080x1920)', () => {
    mockWindow(1080, 1920);
    const store = useOrientationStore();
    store.updateOrientation();
    
    expect(store.homeGridCols).toBe(2);
  });

  it('should use 5 columns for horizontal kiosk (1920x1080)', () => {
    mockWindow(1920, 1080);
    const store = useOrientationStore();
    store.updateOrientation();
    
    expect(store.homeGridCols).toBe(5);
  });

  it('should use 5 columns for square screen (1024x1024)', () => {
    mockWindow(1024, 1024);
    const store = useOrientationStore();
    store.updateOrientation();
    
    // Square is treated as landscape
    expect(store.homeGridCols).toBe(5);
  });
});

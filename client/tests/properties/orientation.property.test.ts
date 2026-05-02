/**
 * Property-Based Tests for Orientation Detection
 * 
 * **Feature: responsive-orientation, Property 4: Orientation state reactivity**
 * **Validates: Requirements 8.1, 8.3**
 * 
 * Tests that the orientation store correctly detects portrait vs landscape
 * based on screen dimensions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { setActivePinia, createPinia } from 'pinia';
import { useOrientationStore } from '@/stores/orientation';

// Mock window object for testing
function mockWindow(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  
  // Mock matchMedia
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

describe('Orientation Detection Properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  /**
   * Property 4: Orientation state reactivity
   * For any screen dimensions, the orientation detection should correctly
   * identify portrait (height > width) vs landscape (width >= height)
   */
  it('should correctly detect orientation based on aspect ratio', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }), // width
        fc.integer({ min: 320, max: 2560 }), // height
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const expectedPortrait = height > width;
          
          // Verify orientation detection matches expected
          expect(store.isPortrait).toBe(expectedPortrait);
          expect(store.isLandscape).toBe(!expectedPortrait);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Aspect ratio calculation is correct
   * For any dimensions, aspectRatio should equal width / height
   */
  it('should calculate correct aspect ratio', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const expectedRatio = width / height;
          
          expect(store.aspectRatio).toBeCloseTo(expectedRatio, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Grid columns are consistent with orientation
   * Portrait mode should have fewer columns than landscape mode
   */
  it('should provide correct grid columns based on orientation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const isPortrait = height > width;
          
          if (isPortrait) {
            // Portrait: fewer columns
            expect(store.homeGridCols).toBe(2);
            expect(store.searchGridCols).toBe(1);
            expect(store.galaxyGridCols).toBe(2);
            expect(store.videoGridCols).toBe(2);
          } else {
            // Landscape: more columns
            expect(store.homeGridCols).toBe(5);
            expect(store.searchGridCols).toBe(3);
            expect(store.galaxyGridCols).toBe(4);
            expect(store.videoGridCols).toBe(4);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Touch target size is larger in portrait mode
   * Portrait mode should have minimum 48px touch targets
   */
  it('should provide correct touch target size based on orientation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const isPortrait = height > width;
          
          if (isPortrait) {
            expect(store.minTouchTarget).toBe(48);
          } else {
            expect(store.minTouchTarget).toBe(44);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Orientation class name is consistent
   */
  it('should provide correct orientation class name', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const isPortrait = height > width;
          const expectedClass = isPortrait ? 'is-portrait' : 'is-landscape';
          
          expect(store.orientationClass).toBe(expectedClass);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Screen dimensions are stored correctly
   */
  it('should store screen dimensions correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          expect(store.screenWidth).toBe(width);
          expect(store.screenHeight).toBe(height);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Orientation Detection Edge Cases', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should handle square screens (width === height) as landscape', () => {
    const size = 1024;
    mockWindow(size, size);
    
    const store = useOrientationStore();
    store.updateOrientation();
    
    // Square screens are treated as landscape (width >= height)
    expect(store.isLandscape).toBe(true);
    expect(store.isPortrait).toBe(false);
  });

  it('should handle typical portrait tablet dimensions', () => {
    // iPad portrait: 768 x 1024
    mockWindow(768, 1024);
    
    const store = useOrientationStore();
    store.updateOrientation();
    
    expect(store.isPortrait).toBe(true);
    expect(store.homeGridCols).toBe(2);
  });

  it('should handle typical landscape tablet dimensions', () => {
    // iPad landscape: 1024 x 768
    mockWindow(1024, 768);
    
    const store = useOrientationStore();
    store.updateOrientation();
    
    expect(store.isLandscape).toBe(true);
    expect(store.homeGridCols).toBe(5);
  });

  it('should handle typical portrait kiosk dimensions', () => {
    // Vertical kiosk: 1080 x 1920
    mockWindow(1080, 1920);
    
    const store = useOrientationStore();
    store.updateOrientation();
    
    expect(store.isPortrait).toBe(true);
    expect(store.homeGridCols).toBe(2);
    expect(store.minTouchTarget).toBe(48);
  });
});


describe('Form Input Width Properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  /**
   * Property 6: Full-width elements in portrait mode
   * **Feature: responsive-orientation, Property 6: Full-width elements in portrait mode**
   * **Validates: Requirements 6.2, 7.3**
   * 
   * For any card or form input element in portrait mode, the computed width
   * should be 100% of the parent container width.
   */
  it('should indicate full-width form inputs in portrait mode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const isPortrait = height > width;
          
          // In portrait mode, form inputs should be full width
          if (isPortrait) {
            expect(store.formInputWidth).toBe('100%');
            expect(store.cardWidth).toBe('100%');
          } else {
            // In landscape mode, form inputs can be auto width
            expect(store.formInputWidth).toBe('auto');
            expect(store.cardWidth).toBe('auto');
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Form input minimum height in portrait mode
   * Touch-friendly inputs should have minimum height of 48px in portrait
   */
  it('should provide correct form input height based on orientation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        (width, height) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          const isPortrait = height > width;
          
          if (isPortrait) {
            expect(store.formInputMinHeight).toBe(52); // 48px + padding
          } else {
            expect(store.formInputMinHeight).toBe(44);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Touch Target Size Properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  /**
   * Property 3: Touch target minimum size in portrait mode
   * **Feature: responsive-orientation, Property 3: Touch target minimum size in portrait mode**
   * **Validates: Requirements 1.4, 4.4**
   * 
   * For any interactive element in portrait mode, the computed touch target size
   * should be at least 48x48 pixels.
   */
  it('should ensure minimum touch target size of 48px in portrait mode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1080 }), // typical portrait widths
        fc.integer({ min: 480, max: 1920 }), // typical portrait heights (taller than width)
        (width, height) => {
          // Ensure portrait mode (height > width)
          const actualHeight = Math.max(height, width + 1);
          const actualWidth = Math.min(width, height - 1);
          
          mockWindow(actualWidth, actualHeight);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          // In portrait mode, touch targets should be at least 48px
          expect(store.isPortrait).toBe(true);
          expect(store.minTouchTarget).toBeGreaterThanOrEqual(48);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Touch target size is smaller in landscape mode
   * Landscape mode can have smaller touch targets (44px minimum)
   */
  it('should allow smaller touch targets in landscape mode', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 480, max: 2560 }), // typical landscape widths
        fc.integer({ min: 320, max: 1080 }), // typical landscape heights (shorter than width)
        (width, height) => {
          // Ensure landscape mode (width >= height)
          const actualWidth = Math.max(width, height);
          const actualHeight = Math.min(height, width);
          
          mockWindow(actualWidth, actualHeight);
          
          const store = useOrientationStore();
          store.updateOrientation();
          
          // In landscape mode, touch targets can be 44px
          expect(store.isLandscape).toBe(true);
          expect(store.minTouchTarget).toBe(44);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


describe('Orientation Persistence Properties', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  /**
   * Property 5: Orientation persistence across navigation
   * **Feature: responsive-orientation, Property 5: Orientation persistence across navigation**
   * **Validates: Requirements 2.3**
   * 
   * For any navigation between pages, the orientation state should remain
   * consistent and not reset.
   */
  it('should maintain orientation state across multiple updates', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            width: fc.integer({ min: 320, max: 2560 }),
            height: fc.integer({ min: 320, max: 2560 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (dimensions) => {
          const store = useOrientationStore();
          
          // Simulate multiple "navigation" events with same dimensions
          // (orientation should persist)
          dimensions.forEach(({ width, height }) => {
            mockWindow(width, height);
            store.updateOrientation();
            
            const expectedPortrait = height > width;
            
            // Verify state is consistent after each update
            expect(store.isPortrait).toBe(expectedPortrait);
            expect(store.isLandscape).toBe(!expectedPortrait);
            expect(store.screenWidth).toBe(width);
            expect(store.screenHeight).toBe(height);
          });
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Orientation state is idempotent
   * Calling updateOrientation multiple times with same dimensions
   * should produce the same result
   */
  it('should be idempotent when called multiple times', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 320, max: 2560 }),
        fc.integer({ min: 1, max: 5 }), // number of calls
        (width, height, calls) => {
          mockWindow(width, height);
          
          const store = useOrientationStore();
          
          // Call updateOrientation multiple times
          for (let i = 0; i < calls; i++) {
            store.updateOrientation();
          }
          
          const expectedPortrait = height > width;
          
          // State should be consistent regardless of number of calls
          expect(store.isPortrait).toBe(expectedPortrait);
          expect(store.isLandscape).toBe(!expectedPortrait);
          expect(store.aspectRatio).toBeCloseTo(width / height, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Orientation state transitions correctly
   * When dimensions change from portrait to landscape (or vice versa),
   * the state should update correctly
   */
  it('should correctly transition between orientations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 1080 }), // portrait width
        fc.integer({ min: 1081, max: 2560 }), // portrait height (taller)
        fc.integer({ min: 1081, max: 2560 }), // landscape width (wider)
        fc.integer({ min: 320, max: 1080 }), // landscape height
        (pWidth, pHeight, lWidth, lHeight) => {
          const store = useOrientationStore();
          
          // Start in portrait mode
          mockWindow(pWidth, pHeight);
          store.updateOrientation();
          expect(store.isPortrait).toBe(true);
          
          // Transition to landscape
          mockWindow(lWidth, lHeight);
          store.updateOrientation();
          expect(store.isLandscape).toBe(true);
          
          // Transition back to portrait
          mockWindow(pWidth, pHeight);
          store.updateOrientation();
          expect(store.isPortrait).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});

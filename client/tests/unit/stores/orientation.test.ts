/**
 * orientationStore 单元测试
 * 测试屏幕方向检测和响应式配置
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { setActivePinia, createPinia } from 'pinia';
import { useOrientationStore } from '@/stores/orientation';

// Mock window object
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

describe('orientationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('orientation detection', () => {
    it('should detect portrait orientation', () => {
      mockWindow(768, 1024);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.isPortrait).toBe(true);
      expect(store.isLandscape).toBe(false);
    });

    it('should detect landscape orientation', () => {
      mockWindow(1024, 768);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.isPortrait).toBe(false);
      expect(store.isLandscape).toBe(true);
    });

    it('should treat square as landscape', () => {
      mockWindow(1024, 1024);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.isLandscape).toBe(true);
      expect(store.isPortrait).toBe(false);
    });

    /**
     * **Feature: comprehensive-unit-testing, Property 20: 屏幕方向检测正确性**
     * **Validates: Requirements 5.3**
     */
    it('property: orientation detection should be correct for any dimensions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 320, max: 2560 }),
          fc.integer({ min: 320, max: 2560 }),
          (width, height) => {
            mockWindow(width, height);
            
            const store = useOrientationStore();
            store.updateOrientation();
            
            const expectedPortrait = height > width;
            
            expect(store.isPortrait).toBe(expectedPortrait);
            expect(store.isLandscape).toBe(!expectedPortrait);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('screen dimensions', () => {
    it('should store screen dimensions correctly', () => {
      mockWindow(1920, 1080);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.screenWidth).toBe(1920);
      expect(store.screenHeight).toBe(1080);
    });

    it('property: dimensions should be stored correctly', () => {
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

  describe('aspect ratio', () => {
    it('should calculate correct aspect ratio', () => {
      mockWindow(1920, 1080);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.aspectRatio).toBeCloseTo(1920 / 1080, 5);
    });

    it('property: aspect ratio should equal width / height', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 320, max: 2560 }),
          fc.integer({ min: 320, max: 2560 }),
          (width, height) => {
            mockWindow(width, height);
            
            const store = useOrientationStore();
            store.updateOrientation();
            
            expect(store.aspectRatio).toBeCloseTo(width / height, 5);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('grid columns', () => {
    it('should return correct grid columns for portrait', () => {
      mockWindow(768, 1024);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.homeGridCols).toBe(2);
      expect(store.searchGridCols).toBe(1);
      expect(store.galaxyGridCols).toBe(2);
      expect(store.videoGridCols).toBe(2);
    });

    it('should return correct grid columns for landscape', () => {
      mockWindow(1024, 768);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.homeGridCols).toBe(5);
      expect(store.searchGridCols).toBe(3);
      expect(store.galaxyGridCols).toBe(4);
      expect(store.videoGridCols).toBe(4);
    });
  });

  describe('touch target size', () => {
    it('should return larger touch target for portrait', () => {
      mockWindow(768, 1024);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.minTouchTarget).toBe(48);
    });

    it('should return smaller touch target for landscape', () => {
      mockWindow(1024, 768);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.minTouchTarget).toBe(44);
    });
  });

  describe('orientation class', () => {
    it('should return correct class for portrait', () => {
      mockWindow(768, 1024);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.orientationClass).toBe('is-portrait');
    });

    it('should return correct class for landscape', () => {
      mockWindow(1024, 768);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.orientationClass).toBe('is-landscape');
    });
  });

  describe('form input width', () => {
    it('should return full width for portrait', () => {
      mockWindow(768, 1024);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.formInputWidth).toBe('100%');
      expect(store.cardWidth).toBe('100%');
    });

    it('should return auto width for landscape', () => {
      mockWindow(1024, 768);
      
      const store = useOrientationStore();
      store.updateOrientation();
      
      expect(store.formInputWidth).toBe('auto');
      expect(store.cardWidth).toBe('auto');
    });
  });

  describe('idempotency', () => {
    it('should be idempotent when called multiple times', () => {
      mockWindow(1024, 768);
      
      const store = useOrientationStore();
      
      store.updateOrientation();
      const firstState = {
        isPortrait: store.isPortrait,
        isLandscape: store.isLandscape,
        aspectRatio: store.aspectRatio,
      };
      
      store.updateOrientation();
      store.updateOrientation();
      
      expect(store.isPortrait).toBe(firstState.isPortrait);
      expect(store.isLandscape).toBe(firstState.isLandscape);
      expect(store.aspectRatio).toBe(firstState.aspectRatio);
    });
  });
});

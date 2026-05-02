/**
 * geometry 工具函数单元测试
 * 测试几何计算功能
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isPointInBoundingBox,
  calculateOverlapRatio,
  getBoundingBoxCenter,
  getDistance,
  findFaceTagAtPoint,
  pixelToPercent,
  percentToPixel,
  Point,
  BoundingBox,
} from '../../../src/utils/geometry';

describe('isPointInBoundingBox', () => {
  it('should return true when point is inside box', () => {
    const point: Point = { x: 50, y: 50 };
    const box: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
    expect(isPointInBoundingBox(point, box)).toBe(true);
  });

  it('should return true when point is on box edge', () => {
    const box: BoundingBox = { x: 10, y: 10, width: 20, height: 20 };
    
    // Left edge
    expect(isPointInBoundingBox({ x: 10, y: 20 }, box)).toBe(true);
    // Right edge
    expect(isPointInBoundingBox({ x: 30, y: 20 }, box)).toBe(true);
    // Top edge
    expect(isPointInBoundingBox({ x: 20, y: 10 }, box)).toBe(true);
    // Bottom edge
    expect(isPointInBoundingBox({ x: 20, y: 30 }, box)).toBe(true);
  });

  it('should return true when point is on corner', () => {
    const box: BoundingBox = { x: 10, y: 10, width: 20, height: 20 };
    
    expect(isPointInBoundingBox({ x: 10, y: 10 }, box)).toBe(true);
    expect(isPointInBoundingBox({ x: 30, y: 10 }, box)).toBe(true);
    expect(isPointInBoundingBox({ x: 10, y: 30 }, box)).toBe(true);
    expect(isPointInBoundingBox({ x: 30, y: 30 }, box)).toBe(true);
  });

  it('should return false when point is outside box', () => {
    const box: BoundingBox = { x: 10, y: 10, width: 20, height: 20 };
    
    expect(isPointInBoundingBox({ x: 5, y: 20 }, box)).toBe(false);
    expect(isPointInBoundingBox({ x: 35, y: 20 }, box)).toBe(false);
    expect(isPointInBoundingBox({ x: 20, y: 5 }, box)).toBe(false);
    expect(isPointInBoundingBox({ x: 20, y: 35 }, box)).toBe(false);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 10: 点在边界框内判断正确性**
   * **Validates: Requirements 4.2**
   */
  it('property: point inside box should always return true', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 50 }),
          y: fc.integer({ min: 0, max: 50 }),
          width: fc.integer({ min: 10, max: 50 }),
          height: fc.integer({ min: 10, max: 50 }),
        }),
        (box) => {
          // Generate a point that is definitely inside the box
          const point: Point = {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
          };
          
          expect(isPointInBoundingBox(point, box)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: point outside box should always return false', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 20, max: 50 }),
          y: fc.integer({ min: 20, max: 50 }),
          width: fc.integer({ min: 10, max: 30 }),
          height: fc.integer({ min: 10, max: 30 }),
        }),
        (box) => {
          // Generate a point that is definitely outside the box (to the left)
          const point: Point = {
            x: box.x - 10,
            y: box.y + box.height / 2,
          };
          
          expect(isPointInBoundingBox(point, box)).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('calculateOverlapRatio', () => {
  it('should return 0 when boxes do not overlap', () => {
    const box1: BoundingBox = { x: 0, y: 0, width: 10, height: 10 };
    const box2: BoundingBox = { x: 20, y: 20, width: 10, height: 10 };
    expect(calculateOverlapRatio(box1, box2)).toBe(0);
  });

  it('should return 1 when one box is completely inside another', () => {
    const box1: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
    const box2: BoundingBox = { x: 25, y: 25, width: 50, height: 50 };
    expect(calculateOverlapRatio(box1, box2)).toBe(1);
  });

  it('should return correct ratio for partial overlap', () => {
    const box1: BoundingBox = { x: 0, y: 0, width: 20, height: 20 };
    const box2: BoundingBox = { x: 10, y: 10, width: 20, height: 20 };
    
    // Intersection is 10x10 = 100
    // Smaller box area is 400
    // Ratio = 100/400 = 0.25
    const ratio = calculateOverlapRatio(box1, box2);
    expect(ratio).toBeCloseTo(0.25, 2);
  });

  it('should return 0 when boxes touch but do not overlap', () => {
    const box1: BoundingBox = { x: 0, y: 0, width: 10, height: 10 };
    const box2: BoundingBox = { x: 10, y: 0, width: 10, height: 10 };
    expect(calculateOverlapRatio(box1, box2)).toBe(0);
  });

  it('should handle zero-area boxes', () => {
    const box1: BoundingBox = { x: 0, y: 0, width: 0, height: 0 };
    const box2: BoundingBox = { x: 0, y: 0, width: 10, height: 10 };
    expect(calculateOverlapRatio(box1, box2)).toBe(0);
  });

  /**
   * **Feature: comprehensive-unit-testing, Property 11: 边界框重叠计算正确性**
   * **Validates: Requirements 4.2**
   */
  it('property: overlap ratio should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 50 }),
          y: fc.integer({ min: 0, max: 50 }),
          width: fc.integer({ min: 1, max: 50 }),
          height: fc.integer({ min: 1, max: 50 }),
        }),
        fc.record({
          x: fc.integer({ min: 0, max: 50 }),
          y: fc.integer({ min: 0, max: 50 }),
          width: fc.integer({ min: 1, max: 50 }),
          height: fc.integer({ min: 1, max: 50 }),
        }),
        (box1, box2) => {
          const ratio = calculateOverlapRatio(box1, box2);
          expect(ratio).toBeGreaterThanOrEqual(0);
          expect(ratio).toBeLessThanOrEqual(1);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('getBoundingBoxCenter', () => {
  it('should return correct center for box at origin', () => {
    const box: BoundingBox = { x: 0, y: 0, width: 100, height: 100 };
    const center = getBoundingBoxCenter(box);
    expect(center.x).toBe(50);
    expect(center.y).toBe(50);
  });

  it('should return correct center for offset box', () => {
    const box: BoundingBox = { x: 10, y: 20, width: 30, height: 40 };
    const center = getBoundingBoxCenter(box);
    expect(center.x).toBe(25);
    expect(center.y).toBe(40);
  });

  it('should handle zero-size box', () => {
    const box: BoundingBox = { x: 50, y: 50, width: 0, height: 0 };
    const center = getBoundingBoxCenter(box);
    expect(center.x).toBe(50);
    expect(center.y).toBe(50);
  });
});

describe('getDistance', () => {
  it('should return 0 for same point', () => {
    const p: Point = { x: 10, y: 20 };
    expect(getDistance(p, p)).toBe(0);
  });

  it('should return correct distance for horizontal line', () => {
    const p1: Point = { x: 0, y: 0 };
    const p2: Point = { x: 10, y: 0 };
    expect(getDistance(p1, p2)).toBe(10);
  });

  it('should return correct distance for vertical line', () => {
    const p1: Point = { x: 0, y: 0 };
    const p2: Point = { x: 0, y: 10 };
    expect(getDistance(p1, p2)).toBe(10);
  });

  it('should return correct distance for diagonal (3-4-5 triangle)', () => {
    const p1: Point = { x: 0, y: 0 };
    const p2: Point = { x: 3, y: 4 };
    expect(getDistance(p1, p2)).toBe(5);
  });

  it('should be symmetric', () => {
    const p1: Point = { x: 10, y: 20 };
    const p2: Point = { x: 30, y: 40 };
    expect(getDistance(p1, p2)).toBe(getDistance(p2, p1));
  });
});

describe('findFaceTagAtPoint', () => {
  it('should return -1 when no face tags', () => {
    const point: Point = { x: 50, y: 50 };
    expect(findFaceTagAtPoint(point, [])).toBe(-1);
  });

  it('should return -1 when point is not in any face tag', () => {
    const point: Point = { x: 50, y: 50 };
    const faceTags = [
      { boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
      { boundingBox: { x: 80, y: 80, width: 10, height: 10 } },
    ];
    expect(findFaceTagAtPoint(point, faceTags)).toBe(-1);
  });

  it('should return correct index when point is in a face tag', () => {
    const point: Point = { x: 15, y: 15 };
    const faceTags = [
      { boundingBox: { x: 0, y: 0, width: 10, height: 10 } },
      { boundingBox: { x: 10, y: 10, width: 20, height: 20 } },
      { boundingBox: { x: 50, y: 50, width: 10, height: 10 } },
    ];
    expect(findFaceTagAtPoint(point, faceTags)).toBe(1);
  });

  it('should return first matching index when point is in multiple face tags', () => {
    const point: Point = { x: 15, y: 15 };
    const faceTags = [
      { boundingBox: { x: 10, y: 10, width: 20, height: 20 } },
      { boundingBox: { x: 0, y: 0, width: 30, height: 30 } },
    ];
    expect(findFaceTagAtPoint(point, faceTags)).toBe(0);
  });
});

describe('pixelToPercent', () => {
  it('should convert pixel coordinates to percent', () => {
    const result = pixelToPercent(100, 200, 1000, 1000);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });

  it('should handle origin', () => {
    const result = pixelToPercent(0, 0, 1000, 1000);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('should handle full size', () => {
    const result = pixelToPercent(1000, 1000, 1000, 1000);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });
});

describe('percentToPixel', () => {
  it('should convert percent coordinates to pixel', () => {
    const result = percentToPixel(10, 20, 1000, 1000);
    expect(result.x).toBe(100);
    expect(result.y).toBe(200);
  });

  it('should handle origin', () => {
    const result = percentToPixel(0, 0, 1000, 1000);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('should handle full size', () => {
    const result = percentToPixel(100, 100, 1000, 1000);
    expect(result.x).toBe(1000);
    expect(result.y).toBe(1000);
  });
});

describe('Coordinate Conversion Round Trip', () => {
  /**
   * **Feature: comprehensive-unit-testing, Property 12: 坐标转换往返一致性**
   * **Validates: Requirements 4.2**
   */
  it('property: pixelToPercent then percentToPixel should return original coordinates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 100, max: 2000 }),
        (pixelX, pixelY, imageWidth, imageHeight) => {
          // Ensure pixel coordinates are within image bounds
          const safePixelX = Math.min(pixelX, imageWidth);
          const safePixelY = Math.min(pixelY, imageHeight);
          
          const percent = pixelToPercent(safePixelX, safePixelY, imageWidth, imageHeight);
          const pixel = percentToPixel(percent.x, percent.y, imageWidth, imageHeight);
          
          // Allow small floating point error
          expect(pixel.x).toBeCloseTo(safePixelX, 5);
          expect(pixel.y).toBeCloseTo(safePixelY, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: percentToPixel then pixelToPercent should return original coordinates', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 100, max: 2000 }),
        (percentX, percentY, imageWidth, imageHeight) => {
          const pixel = percentToPixel(percentX, percentY, imageWidth, imageHeight);
          const percent = pixelToPercent(pixel.x, pixel.y, imageWidth, imageHeight);
          
          // Allow small floating point error
          expect(percent.x).toBeCloseTo(percentX, 5);
          expect(percent.y).toBeCloseTo(percentY, 5);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

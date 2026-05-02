/**
 * 几何计算工具函数
 */

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;      // 左上角X坐标（百分比 0-100）
  y: number;      // 左上角Y坐标（百分比 0-100）
  width: number;  // 宽度（百分比 0-100）
  height: number; // 高度（百分比 0-100）
}

/**
 * 判断点是否在边界框内
 * @param point 点坐标（百分比 0-100）
 * @param box 边界框（百分比 0-100）
 * @returns 是否在边界框内
 */
export function isPointInBoundingBox(point: Point, box: BoundingBox): boolean {
  const { x, y } = point;
  const { x: boxX, y: boxY, width, height } = box;

  return (
    x >= boxX &&
    x <= boxX + width &&
    y >= boxY &&
    y <= boxY + height
  );
}

/**
 * 计算两个边界框的交集面积比例
 * @param box1 边界框1
 * @param box2 边界框2
 * @returns 交集面积占较小框面积的比例 (0-1)
 */
export function calculateOverlapRatio(box1: BoundingBox, box2: BoundingBox): number {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  if (x2 <= x1 || y2 <= y1) {
    return 0; // 无交集
  }

  const intersectionArea = (x2 - x1) * (y2 - y1);
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const smallerArea = Math.min(area1, area2);

  return smallerArea > 0 ? intersectionArea / smallerArea : 0;
}

/**
 * 计算边界框的中心点
 * @param box 边界框
 * @returns 中心点坐标
 */
export function getBoundingBoxCenter(box: BoundingBox): Point {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * 计算两点之间的距离
 * @param p1 点1
 * @param p2 点2
 * @returns 距离
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 查找点击位置对应的人脸标记
 * @param point 点击位置（百分比 0-100）
 * @param faceTags 人脸标记数组
 * @returns 匹配的人脸标记索引，未找到返回 -1
 */
export function findFaceTagAtPoint(
  point: Point,
  faceTags: Array<{ boundingBox: BoundingBox }>
): number {
  for (let i = 0; i < faceTags.length; i++) {
    if (isPointInBoundingBox(point, faceTags[i].boundingBox)) {
      return i;
    }
  }
  return -1;
}

/**
 * 将像素坐标转换为百分比坐标
 * @param pixelX 像素X坐标
 * @param pixelY 像素Y坐标
 * @param imageWidth 图片宽度
 * @param imageHeight 图片高度
 * @returns 百分比坐标
 */
export function pixelToPercent(
  pixelX: number,
  pixelY: number,
  imageWidth: number,
  imageHeight: number
): Point {
  return {
    x: (pixelX / imageWidth) * 100,
    y: (pixelY / imageHeight) * 100,
  };
}

/**
 * 将百分比坐标转换为像素坐标
 * @param percentX 百分比X坐标
 * @param percentY 百分比Y坐标
 * @param imageWidth 图片宽度
 * @param imageHeight 图片高度
 * @returns 像素坐标
 */
export function percentToPixel(
  percentX: number,
  percentY: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: (percentX / 100) * imageWidth,
    y: (percentY / 100) * imageHeight,
  };
}

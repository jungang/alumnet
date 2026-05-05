/**
 * 触屏滑动手势 composable
 * 支持左右滑动翻页、下拉刷新
 */
import { ref } from 'vue';

interface SwipeOptions {
  /** 最小滑动距离（px），低于此值不触发 */
  threshold?: number;
  /** 左滑回调 */
  onSwipeLeft?: () => void;
  /** 右滑回调 */
  onSwipeRight?: () => void;
  /** 下拉回调 */
  onPullDown?: () => void;
  /** 下拉刷新最小距离 */
  pullDownThreshold?: number;
}

export function useSwipe(options: SwipeOptions = {}) {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onPullDown,
    pullDownThreshold = 80,
  } = options;

  const isSwiping = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const deltaX = ref(0);
  const deltaY = ref(0);
  const isPullingDown = ref(false);

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    startX.value = touch.clientX;
    startY.value = touch.clientY;
    deltaX.value = 0;
    deltaY.value = 0;
    isSwiping.value = true;
    isPullingDown.value = false;
  }

  function onTouchMove(e: TouchEvent) {
    if (!isSwiping.value) return;
    const touch = e.touches[0];
    deltaX.value = touch.clientX - startX.value;
    deltaY.value = touch.clientY - startY.value;

    // 检测是否是下拉手势（垂直方向偏移大于水平）
    if (Math.abs(deltaY.value) > Math.abs(deltaX.value) && deltaY.value > 0) {
      isPullingDown.value = deltaY.value > pullDownThreshold;
    }
  }

  function onTouchEnd() {
    if (!isSwiping.value) return;
    isSwiping.value = false;

    const absX = Math.abs(deltaX.value);
    const absY = Math.abs(deltaY.value);

    // 水平滑动优先
    if (absX > absY && absX > threshold) {
      if (deltaX.value < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX.value > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }

    // 下拉刷新
    if (isPullingDown.value && onPullDown) {
      onPullDown();
    }

    isPullingDown.value = false;
    deltaX.value = 0;
    deltaY.value = 0;
  }

  return {
    isSwiping,
    isPullingDown,
    deltaX,
    deltaY,
    swipeHandlers: {
      onTouchstart: onTouchStart,
      onTouchmove: onTouchMove,
      onTouchend: onTouchEnd,
    },
  };
}

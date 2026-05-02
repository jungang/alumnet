import { defineStore } from 'pinia';
import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * 屏幕方向检测 Store
 * 用于检测和响应设备屏幕方向变化（横屏/竖屏）
 */
export const useOrientationStore = defineStore('orientation', () => {
  // 状态
  const isPortrait = ref(false);
  const isLandscape = ref(true);
  const aspectRatio = ref(1);
  const screenWidth = ref(0);
  const screenHeight = ref(0);

  // 媒体查询对象
  let mediaQuery: MediaQueryList | null = null;

  /**
   * 检测当前屏幕方向
   */
  function detectOrientation(): 'portrait' | 'landscape' {
    // 优先使用 matchMedia API
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(orientation: portrait)');
      return mq.matches ? 'portrait' : 'landscape';
    }
    // 回退方案：比较宽高
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    }
    return 'landscape';
  }

  /**
   * 更新方向状态
   */
  function updateOrientation() {
    if (typeof window === 'undefined') return;

    screenWidth.value = window.innerWidth;
    screenHeight.value = window.innerHeight;
    aspectRatio.value = screenWidth.value / screenHeight.value;

    const orientation = detectOrientation();
    isPortrait.value = orientation === 'portrait';
    isLandscape.value = orientation === 'landscape';
  }

  /**
   * 处理媒体查询变化
   */
  function handleMediaQueryChange(e: MediaQueryListEvent) {
    isPortrait.value = e.matches;
    isLandscape.value = !e.matches;
    updateOrientation();
  }

  /**
   * 初始化方向监听
   */
  function init() {
    if (typeof window === 'undefined') return;

    // 初始检测
    updateOrientation();

    // 使用 matchMedia 监听方向变化
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(orientation: portrait)');
      mediaQuery.addEventListener('change', handleMediaQueryChange);
    }

    // 同时监听 resize 事件作为备用
    window.addEventListener('resize', updateOrientation);
  }

  /**
   * 清理监听器
   */
  function cleanup() {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateOrientation);
    }
  }

  // 计算属性：首页网格列数
  const homeGridCols = computed(() => isPortrait.value ? 2 : 5);

  // 计算属性：搜索结果网格列数
  const searchGridCols = computed(() => isPortrait.value ? 1 : 3);

  // 计算属性：校友风采网格列数
  const galaxyGridCols = computed(() => isPortrait.value ? 2 : 4);

  // 计算属性：视频网格列数
  const videoGridCols = computed(() => isPortrait.value ? 2 : 4);

  // 计算属性：卡片尺寸
  const cardSize = computed<'sm' | 'md' | 'lg'>(() => {
    if (isPortrait.value) {
      return screenWidth.value < 640 ? 'lg' : 'md';
    }
    return 'sm';
  });

  // 计算属性：触控目标最小尺寸
  const minTouchTarget = computed(() => isPortrait.value ? 48 : 44);

  // 计算属性：方向类名（用于动态绑定）
  const orientationClass = computed(() => isPortrait.value ? 'is-portrait' : 'is-landscape');

  // 计算属性：表单输入宽度
  const formInputWidth = computed(() => isPortrait.value ? '100%' : 'auto');

  // 计算属性：卡片宽度
  const cardWidth = computed(() => isPortrait.value ? '100%' : 'auto');

  // 计算属性：表单输入最小高度
  const formInputMinHeight = computed(() => isPortrait.value ? 52 : 44);

  return {
    // 状态
    isPortrait,
    isLandscape,
    aspectRatio,
    screenWidth,
    screenHeight,
    // 计算属性
    homeGridCols,
    searchGridCols,
    galaxyGridCols,
    videoGridCols,
    cardSize,
    minTouchTarget,
    orientationClass,
    formInputWidth,
    cardWidth,
    formInputMinHeight,
    // 方法
    detectOrientation,
    updateOrientation,
    init,
    cleanup,
  };
});

/**
 * 组合式函数：在组件中使用方向检测
 */
export function useOrientation() {
  const store = useOrientationStore();

  onMounted(() => {
    store.init();
  });

  onUnmounted(() => {
    store.cleanup();
  });

  return store;
}

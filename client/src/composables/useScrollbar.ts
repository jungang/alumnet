import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export interface ScrollbarOptions {
  /** 隐藏延迟（毫秒），默认3000 */
  hideDelay?: number;
  /** 滚动时显示，默认true */
  showOnScroll?: boolean;
  /** 目标元素引用 */
  targetRef?: Ref<HTMLElement | null>;
}

export interface ScrollbarReturn {
  /** 滚动条是否可见 */
  isVisible: Ref<boolean>;
  /** 是否正在滚动 */
  isScrolling: Ref<boolean>;
  /** 显示滚动条 */
  show: () => void;
  /** 隐藏滚动条 */
  hide: () => void;
  /** 滚动事件处理器 */
  onScroll: () => void;
  /** 绑定到目标元素 */
  bind: (el: HTMLElement) => void;
  /** 解绑 */
  unbind: () => void;
}

export function useScrollbar(options: ScrollbarOptions = {}): ScrollbarReturn {
  const {
    hideDelay = 3000,
    showOnScroll = true,
  } = options;

  const isVisible = ref(false);
  const isScrolling = ref(false);
  
  let hideTimer: number | null = null;
  let scrollEndTimer: number | null = null;
  let boundElement: HTMLElement | null = null;

  function clearHideTimer() {
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function clearScrollEndTimer() {
    if (scrollEndTimer !== null) {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = null;
    }
  }

  function show() {
    isVisible.value = true;
    clearHideTimer();
  }

  function hide() {
    isVisible.value = false;
    clearHideTimer();
  }

  function scheduleHide() {
    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      if (!isScrolling.value) {
        hide();
      }
    }, hideDelay);
  }

  function onScroll() {
    if (showOnScroll) {
      show();
      isScrolling.value = true;
      
      // 检测滚动结束
      clearScrollEndTimer();
      scrollEndTimer = window.setTimeout(() => {
        isScrolling.value = false;
        scheduleHide();
      }, 150);
    }
  }

  function handleScroll() {
    onScroll();
  }

  function bind(el: HTMLElement) {
    if (boundElement) {
      unbind();
    }
    boundElement = el;
    el.addEventListener('scroll', handleScroll, { passive: true });
    
    // 添加滚动条样式类
    el.classList.add('scrollbar-auto-hide');
  }

  function unbind() {
    if (boundElement) {
      boundElement.removeEventListener('scroll', handleScroll);
      boundElement.classList.remove('scrollbar-auto-hide', 'scrolling');
      boundElement = null;
    }
    clearHideTimer();
    clearScrollEndTimer();
  }

  onMounted(() => {
    if (options.targetRef?.value) {
      bind(options.targetRef.value);
    }
  });

  onUnmounted(() => {
    unbind();
  });

  return {
    isVisible,
    isScrolling,
    show,
    hide,
    onScroll,
    bind,
    unbind,
  };
}

import { ref, onMounted, onUnmounted } from 'vue';

export interface AutoRefreshOptions {
  /** 自动刷新间隔（毫秒），默认10000 */
  interval?: number;
  /** 暂停后恢复延迟（毫秒），默认5000 */
  pauseDelay?: number;
  /** 刷新回调函数 */
  onRefresh: () => void;
  /** 是否自动启动，默认true */
  autoStart?: boolean;
}

export interface AutoRefreshReturn {
  /** 是否暂停状态 */
  isPaused: ReturnType<typeof ref<boolean>>;
  /** 是否正在运行 */
  isRunning: ReturnType<typeof ref<boolean>>;
  /** 暂停自动刷新 */
  pause: () => void;
  /** 恢复自动刷新 */
  resume: () => void;
  /** 重置计时器（从当前时间重新计时） */
  reset: () => void;
  /** 启动自动刷新 */
  start: () => void;
  /** 停止自动刷新 */
  stop: () => void;
  /** 销毁（清理所有计时器） */
  destroy: () => void;
  /** 处理触摸开始事件 */
  onTouchStart: () => void;
  /** 处理触摸结束事件 */
  onTouchEnd: () => void;
  /** 处理滚动事件 */
  onScroll: () => void;
}

export function useAutoRefresh(options: AutoRefreshOptions): AutoRefreshReturn {
  const {
    interval = 10000,
    pauseDelay = 5000,
    onRefresh,
    autoStart = true,
  } = options;

  const isPaused = ref(false);
  const isRunning = ref(false);
  
  let refreshTimer: number | null = null;
  let resumeTimer: number | null = null;
  let isTouching = false;

  function clearRefreshTimer() {
    if (refreshTimer !== null) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function clearResumeTimer() {
    if (resumeTimer !== null) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  }

  function startRefreshTimer() {
    clearRefreshTimer();
    refreshTimer = window.setInterval(() => {
      if (!isPaused.value && !isTouching) {
        try {
          onRefresh();
        } catch (e) {
          console.error('Auto-refresh callback error:', e);
          pause();
        }
      }
    }, interval);
  }

  function pause() {
    isPaused.value = true;
    clearResumeTimer();
  }

  function resume() {
    isPaused.value = false;
    clearResumeTimer();
  }

  function reset() {
    clearResumeTimer();
    if (isRunning.value) {
      startRefreshTimer();
    }
  }

  function start() {
    if (isRunning.value) return;
    isRunning.value = true;
    isPaused.value = false;
    startRefreshTimer();
  }

  function stop() {
    isRunning.value = false;
    isPaused.value = false;
    clearRefreshTimer();
    clearResumeTimer();
  }

  function destroy() {
    stop();
  }

  function scheduleResume() {
    clearResumeTimer();
    resumeTimer = window.setTimeout(() => {
      if (!isTouching) {
        resume();
      }
    }, pauseDelay);
  }

  function onTouchStart() {
    isTouching = true;
    pause();
  }

  function onTouchEnd() {
    isTouching = false;
    scheduleResume();
  }

  function onScroll() {
    if (!isPaused.value) {
      pause();
    }
    scheduleResume();
  }

  // 生命周期
  onMounted(() => {
    if (autoStart) {
      start();
    }
  });

  onUnmounted(() => {
    destroy();
  });

  return {
    isPaused,
    isRunning,
    pause,
    resume,
    reset,
    start,
    stop,
    destroy,
    onTouchStart,
    onTouchEnd,
    onScroll,
  };
}

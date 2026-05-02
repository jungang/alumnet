import { ref, onMounted, onUnmounted } from 'vue';

export interface IdleDetectionOptions {
  /** 空闲超时时间（毫秒），默认60000 */
  timeout?: number;
  /** 空闲回调 */
  onIdle: () => void;
  /** 监听的事件类型 */
  events?: string[];
  /** 是否自动启动，默认true */
  autoStart?: boolean;
}

export interface IdleDetectionReturn {
  /** 是否空闲状态 */
  isIdle: ReturnType<typeof ref<boolean>>;
  /** 是否正在运行 */
  isRunning: ReturnType<typeof ref<boolean>>;
  /** 重置计时器 */
  reset: () => void;
  /** 启动检测 */
  start: () => void;
  /** 停止检测 */
  stop: () => void;
  /** 销毁 */
  destroy: () => void;
}

const DEFAULT_EVENTS = [
  'click',
  'touchstart',
  'touchmove',
  'mousemove',
  'keydown',
  'scroll',
  'wheel',
];

export function useIdleDetection(options: IdleDetectionOptions): IdleDetectionReturn {
  const {
    timeout = 60000,
    onIdle,
    events = DEFAULT_EVENTS,
    autoStart = true,
  } = options;

  const isIdle = ref(false);
  const isRunning = ref(false);
  
  let idleTimer: number | null = null;

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function startIdleTimer() {
    clearIdleTimer();
    idleTimer = window.setTimeout(() => {
      isIdle.value = true;
      try {
        onIdle();
      } catch (e) {
        console.error('Idle callback error:', e);
      }
    }, timeout);
  }

  function reset() {
    isIdle.value = false;
    if (isRunning.value) {
      startIdleTimer();
    }
  }

  function handleActivity() {
    if (isRunning.value) {
      reset();
    }
  }

  function addEventListeners() {
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
  }

  function removeEventListeners() {
    events.forEach(event => {
      window.removeEventListener(event, handleActivity);
    });
  }

  function start() {
    if (isRunning.value) return;
    isRunning.value = true;
    isIdle.value = false;
    addEventListeners();
    startIdleTimer();
  }

  function stop() {
    isRunning.value = false;
    isIdle.value = false;
    clearIdleTimer();
    removeEventListeners();
  }

  function destroy() {
    stop();
  }

  onMounted(() => {
    if (autoStart) {
      start();
    }
  });

  onUnmounted(() => {
    destroy();
  });

  return {
    isIdle,
    isRunning,
    reset,
    start,
    stop,
    destroy,
  };
}

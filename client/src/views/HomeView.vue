<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useThemeStore } from '@/stores/theme';

// --- 状态管理 ---
const router = useRouter();
const themeStore = useThemeStore();
const isScreensaver = ref(true);
const idleTimer = ref<number | null>(null);
const IDLE_TIMEOUT = 60000;
const currentTime = ref('');
const currentDate = ref('');
let clockTimer: number;
const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationFrameId: number;

// 主题相关计算属性
const isDark = computed(() => themeStore.isDark);

// 模块定义
const modules = [
  { name: '智能查询', en: 'Smart Search', icon: 'search', path: '/search' },
  { name: '校友风采', en: 'Alumni Galaxy', icon: 'star', path: '/galaxy' },
  { name: '时空长廊', en: 'Time Corridor', icon: 'camera', path: '/corridor' },
  { name: '互动寄语', en: 'Interaction', icon: 'chat', path: '/interaction' },
  { name: '校友服务', en: 'Services', icon: 'handshake', path: '/service' },
];

function updateTime() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  currentDate.value = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
}

function resetIdleTimer() {
  if (idleTimer.value) clearTimeout(idleTimer.value);
  idleTimer.value = window.setTimeout(() => {
    isScreensaver.value = true;
  }, IDLE_TIMEOUT);
}

function handleInteraction() {
  if (isScreensaver.value) {
    isScreensaver.value = false;
  }
  resetIdleTimer();
}

function navigateTo(route: string) {
  router.push(route);
}

// --- Canvas 粒子背景 ---
function initBackground() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles: Array<{x: number, y: number, vx: number, vy: number, size: number}> = [];
  const PARTICLE_COUNT = 80;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.5
    });
  }

  function animate() {
    if (!ctx) return;
    
    // 背景色：深色用深青黑，浅色用乳白色
    ctx.fillStyle = themeStore.isDark ? '#020608' : '#faf8f5';
    ctx.fillRect(0, 0, width, height);

    // 粒子颜色
    ctx.fillStyle = themeStore.isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(139, 37, 0, 0.25)';
    
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          ctx.beginPath();
          const alpha = (1 - dist / 150) * 0.3;
          // 深色用青色，浅色用红木色
          ctx.strokeStyle = themeStore.isDark 
            ? `rgba(20, 184, 166, ${alpha})`
            : `rgba(139, 37, 0, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    });

    animationFrameId = requestAnimationFrame(animate);
  }

  animate();

  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', handleResize);
}

onMounted(() => {
  ['touchstart', 'click', 'mousemove'].forEach(evt => document.addEventListener(evt, handleInteraction));
  updateTime();
  clockTimer = window.setInterval(updateTime, 1000);
  initBackground();
  resetIdleTimer();
});

onUnmounted(() => {
  ['touchstart', 'click', 'mousemove'].forEach(evt => document.removeEventListener(evt, handleInteraction));
  if (idleTimer.value) clearTimeout(idleTimer.value);
  clearInterval(clockTimer);
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div 
    class="relative w-full h-screen overflow-hidden font-sans select-none transition-colors duration-500"
    :class="isDark ? 'text-white bg-[#020608]' : 'text-[#2d1810] bg-[#faf8f5]'"
  >
    <!-- Canvas 粒子背景 -->
    <canvas ref="canvasRef" class="absolute inset-0 z-0"></canvas>
    
    <!-- 径向渐变遮罩 -->
    <div 
      class="absolute inset-0 z-0 opacity-90 pointer-events-none transition-all duration-500"
      :class="isDark 
        ? 'bg-[radial-gradient(circle_at_center,transparent_0%,#001a1a_100%)]' 
        : 'bg-[radial-gradient(circle_at_center,transparent_0%,#f5f0ea_100%)]'"
    ></div>
    
    <!-- 噪点纹理 -->
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

    <Transition name="fade" mode="out-in">
      <!-- 屏保模式 -->
      <div v-if="isScreensaver" class="relative z-10 w-full h-full flex flex-col items-center justify-center cursor-pointer px-4" @click="handleInteraction">
        <div class="text-center space-y-8 portrait:space-y-4 animate-pulse-slow">
          <!-- Logo -->
          <div class="screensaver-logo-container portrait:mb-4">
            <img 
              src="/logo.png" 
alt="示例中学"
              class="h-[370px] portrait:h-[280px] w-auto object-contain transition-all duration-500"
              :class="isDark ? 'drop-shadow-[0_0_60px_rgba(255,255,255,0.4)]' : 'drop-shadow-[0_0_60px_rgba(139,37,0,0.3)]'"
            />
          </div>
          
          <!-- 系统名称 -->
          <h2 
            class="text-7xl portrait:text-5xl font-bold tracking-[0.3em] portrait:tracking-[0.2em] bg-clip-text text-transparent transition-all duration-500"
            :class="isDark 
              ? 'bg-gradient-to-r from-teal-200 via-white to-teal-200' 
              : 'bg-gradient-to-r from-[#8b2500] via-[#2d1810] to-[#8b2500]'"
          >校 友 录</h2>
          
          <p 
            class="text-3xl portrait:text-2xl tracking-[0.5em] portrait:tracking-[0.3em] uppercase transition-colors duration-500"
            :class="isDark ? 'text-teal-200/50' : 'text-[#8b2500]/50'"
          >ALUMNI DIRECTORY</p>
          
          <!-- 时间显示 -->
          <div class="mt-8 portrait:mt-4">
            <h1 
              class="text-[10rem] portrait:text-[6rem] font-bold tracking-tighter bg-clip-text text-transparent filter drop-shadow-lg font-mono transition-all duration-500"
              :class="isDark 
                ? 'bg-gradient-to-b from-white via-teal-100 to-teal-800' 
                : 'bg-gradient-to-b from-[#2d1810] via-[#8b2500] to-[#a63c1c]'"
            >{{ currentTime }}</h1>
            <p 
              class="text-4xl portrait:text-2xl mt-4 portrait:mt-2 font-light tracking-[0.2em] uppercase transition-colors duration-500"
              :class="isDark ? 'text-teal-200/60' : 'text-[#8b2500]/60'"
            >{{ currentDate }}</p>
          </div>
          
          <!-- 唤醒提示 -->
          <div class="mt-10 portrait:mt-6">
            <p 
              class="text-xl portrait:text-base tracking-[0.3em] uppercase mb-2 transition-colors duration-500"
              :class="isDark ? 'text-teal-600' : 'text-[#8b2500]/60'"
            >System Standby</p>
            <div 
              class="flex items-center gap-2 justify-center animate-bounce transition-colors duration-500"
              :class="isDark ? 'text-teal-400' : 'text-[#8b2500]'"
            >
              <span class="text-base portrait:text-sm tracking-wider">触摸屏幕以唤醒系统</span>
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 主界面 -->
      <div v-else class="relative z-10 w-full h-full p-12 portrait:p-6 flex flex-col justify-between">
        <!-- 顶部标题栏 -->
        <header 
          class="flex justify-between items-end portrait:items-start portrait:flex-col portrait:gap-4 pb-6 portrait:pb-4 slide-down border-b transition-colors duration-500"
          :class="isDark ? 'border-teal-500/20' : 'border-[#8b2500]/20'"
        >
          <div class="flex items-center gap-4 portrait:gap-3">
            <img src="/logo.png" alt="示例中学" class="h-16 portrait:h-12 w-auto object-contain" />
            <div>
              <h1 
                class="text-5xl portrait:text-3xl font-bold tracking-wide text-transparent bg-clip-text transition-all duration-500"
                :class="isDark 
                  ? 'bg-gradient-to-r from-teal-300 via-white to-teal-300' 
                  : 'bg-gradient-to-r from-[#8b2500] via-[#2d1810] to-[#8b2500]'"
              >校友录</h1>
              <div class="flex items-center gap-3 mt-2 portrait:mt-1 portrait:hidden">
                <span 
                  class="h-px w-12 transition-colors duration-500"
                  :class="isDark ? 'bg-teal-500' : 'bg-[#8b2500]'"
                ></span>
                <p 
                  class="text-lg portrait:text-sm tracking-wider uppercase transition-colors duration-500"
                  :class="isDark ? 'text-teal-200/70' : 'text-[#8b2500]/70'"
                >History Museum Intelligent System</p>
              </div>
            </div>
          </div>
          <div class="text-right portrait:w-full portrait:flex portrait:justify-between portrait:items-center">
            <div class="portrait:order-2 flex items-center gap-3">
              <div 
                class="text-2xl portrait:text-xl font-mono transition-colors duration-500"
                :class="isDark ? 'text-white/90' : 'text-[#2d1810]'"
              >{{ currentTime }}</div>
              <ThemeToggle />
            </div>
            <div 
              class="text-xs font-mono transition-colors duration-500 portrait:order-1"
              :class="isDark ? 'text-teal-500/60' : 'text-[#8b2500]/60'"
            >SYS.VER.2.0.24</div>
          </div>
        </header>

        <!-- 功能模块网格 -->
        <div class="flex-1 flex items-center justify-center py-8 portrait:py-4">
          <div class="grid grid-cols-5 portrait:grid-cols-2 gap-6 portrait:gap-4 w-full max-w-7xl perspective-1000">
            <button
              v-for="(module, index) in modules"
              :key="module.name"
              @click="navigateTo(module.path)"
              class="group relative h-96 portrait:h-48 rounded-3xl portrait:rounded-2xl transition-all duration-500 hover:-translate-y-4 preserve-3d"
              :style="`animation-delay: ${index * 100}ms`"
            >
              <!-- 玻璃拟态卡片 -->
              <div 
                class="absolute inset-0 backdrop-blur-xl rounded-3xl portrait:rounded-2xl shadow-2xl overflow-hidden transition-all duration-300"
                :class="isDark 
                  ? 'bg-white/5 border border-teal-500/10 group-hover:bg-white/10 group-hover:border-teal-400/30' 
                  : 'bg-white/60 border border-[#8b2500]/10 group-hover:bg-white/80 group-hover:border-[#8b2500]/30'"
              >
                <!-- 渐变高光 -->
                <div 
                  class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  :class="isDark ? 'bg-gradient-to-br from-teal-500/5 to-transparent' : 'bg-gradient-to-br from-[#8b2500]/5 to-transparent'"
                ></div>
                <!-- 光扫过效果 -->
                <div 
                  class="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shine"
                  :class="isDark ? 'to-teal-400/20' : 'to-[#8b2500]/10'"
                />
                
                <!-- 卡片内容 -->
                <div class="relative h-full flex flex-col items-center justify-center p-6 portrait:p-4 text-center z-10">
                  <!-- 图标容器 -->
                  <div 
                    class="w-24 h-24 portrait:w-16 portrait:h-16 mb-8 portrait:mb-4 rounded-full flex items-center justify-center border group-hover:scale-110 transition-transform duration-300"
                    :class="isDark 
                      ? 'bg-black/20 border-white/5 text-teal-400 group-hover:shadow-[0_0_30px_rgba(20,184,166,0.5)]' 
                      : 'bg-[#8b2500]/5 border-[#8b2500]/10 text-[#8b2500] group-hover:shadow-[0_0_30px_rgba(139,37,0,0.3)]'"
                  >
                    <svg v-if="module.icon === 'search'" class="w-10 h-10 portrait:w-7 portrait:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <svg v-if="module.icon === 'star'" class="w-10 h-10 portrait:w-7 portrait:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <svg v-if="module.icon === 'camera'" class="w-10 h-10 portrait:w-7 portrait:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <svg v-if="module.icon === 'chat'" class="w-10 h-10 portrait:w-7 portrait:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <svg v-if="module.icon === 'handshake'" class="w-10 h-10 portrait:w-7 portrait:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11" />
                    </svg>
                  </div>
                  <h3 
                    class="text-2xl portrait:text-lg font-bold mb-2 tracking-wide transition-colors"
                    :class="isDark 
                      ? 'text-white group-hover:text-teal-300' 
                      : 'text-[#2d1810] group-hover:text-[#8b2500]'"
                  >{{ module.name }}</h3>
                  <p 
                    class="text-xs uppercase tracking-widest font-mono transition-colors duration-500"
                    :class="isDark ? 'text-white/40' : 'text-[#8b2500]/40'"
                  >{{ module.en }}</p>
                </div>
              </div>
              <!-- 底部光晕 -->
              <div 
                class="absolute -bottom-4 portrait:-bottom-2 left-4 right-4 h-4 portrait:h-2 blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-500"
                :class="isDark ? 'bg-teal-400' : 'bg-[#8b2500]'"
              ></div>
            </button>
          </div>
        </div>

        <!-- 底部状态栏 -->
        <footer 
          class="flex justify-between items-center portrait:flex-col portrait:items-start portrait:gap-2 text-xs font-mono pt-4 portrait:pt-3 slide-up border-t transition-colors duration-500"
          :class="isDark ? 'text-teal-500/50 border-teal-500/20' : 'text-[#8b2500]/50 border-[#8b2500]/20'"
        >
          <div class="flex gap-4 portrait:gap-2 portrait:flex-wrap">
            <span class="flex items-center gap-2">
              <span 
                class="w-2 h-2 rounded-full animate-pulse"
                :class="isDark ? 'bg-teal-500' : 'bg-[#8b2500]'"
              ></span> SYSTEM ONLINE
            </span>
            <span class="hidden portrait:hidden">DATA CONNECTION: STABLE</span>
          </div>
          <p class="portrait:text-xs">© 2024 JILIN YUWEN HIGH SCHOOL</p>
        </footer>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.8s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 光扫过效果 */
@keyframes shine {
  0% { left: -100%; }
  100% { left: 125%; }
}
.group:hover .animate-shine {
  animation: shine 1s ease-out;
}

/* 呼吸动画 */
.animate-pulse-slow {
  animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* 透视容器 */
.perspective-1000 {
  perspective: 1000px;
}
.preserve-3d {
  transform-style: preserve-3d;
}

/* 入场动画 */
.slide-down {
  animation: slideDown 0.8s ease-out forwards;
}
.slide-up {
  animation: slideUp 0.8s ease-out forwards;
}

@keyframes slideDown {
  from { transform: translateY(-20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Logo 容器 */
.screensaver-logo-container {
  position: relative;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

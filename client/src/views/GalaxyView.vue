<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { contentApi } from '@/api';
import BottomNavigation from '@/components/BottomNavigation.vue';
import AutoScrollPause from '@/components/AutoScrollPause.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAutoRefresh } from '@/composables/useAutoRefresh';

// --- 类型定义 ---
interface Alumni {
  id: string;
  alumni_id: string;
  name: string;
  category: string;
  photo?: string;
  photoUrl?: string;
  achievement?: string;
  graduation_year?: number;
  title?: string;
}

interface AlumniNews {
  id: string;
  title: string;
  alumni_name: string;
  date: string;
  type: 'award' | 'donation' | 'activity' | 'news';
}

// --- 状态 ---
const router = useRouter();
const loading = ref(true);
const alumniList = ref<Alumni[]>([]);
const newsList = ref<AlumniNews[]>([]);
const activeCategory = ref('全部');
const currentPage = ref(0);
const idleTimer = ref<number | null>(null);
const newsIndex = ref(0);

// 使用自动刷新composable
const { isPaused: isAutoPlayPaused, reset: resetAutoPlay, onTouchStart, onTouchEnd, onScroll } = useAutoRefresh({
  interval: 10000,
  pauseDelay: 5000,
  onRefresh: () => {
    nextPage();
  },
  autoStart: true,
});

// 新闻自动滚动
const { onTouchStart: onNewsTouchStart, onTouchEnd: onNewsTouchEnd } = useAutoRefresh({
  interval: 5000,
  pauseDelay: 3000,
  onRefresh: () => {
    newsIndex.value = (newsIndex.value + 1) % (newsList.value.length || 1);
  },
  autoStart: true,
});

// 分类配置
const CATEGORIES = [
  { name: '全部', icon: '✦', color: 'teal' },
  { name: '状元榜', icon: '🏆', color: 'gold' },
  { name: '革命烈士', icon: '🎖️', color: 'red' },
  { name: '政界', icon: '🏛️', color: 'amber' },
  { name: '学术', icon: '🎓', color: 'cyan' },
  { name: '商界', icon: '💼', color: 'emerald' },
  { name: '文化', icon: '🎭', color: 'violet' },
  { name: '医疗', icon: '⚕️', color: 'rose' },
  { name: '教育', icon: '📚', color: 'blue' },
  { name: '科技', icon: '🔬', color: 'indigo' },
  { name: '体育', icon: '⚽', color: 'orange' },
  { name: '军事', icon: '🎯', color: 'slate' },
];

// 过滤后的校友列表
const filteredAlumni = computed(() => {
  if (activeCategory.value === '全部') return alumniList.value;
  return alumniList.value.filter(a => a.category === activeCategory.value);
});

// 分页展示（每页数量：横屏8个，竖屏6个 - 2排3列）
const pageSize = ref(8);
const portraitPageSize = 6; // 竖屏时2排3列
const isPortrait = ref(false);

// 检测屏幕方向
function checkOrientation() {
  isPortrait.value = window.innerHeight > window.innerWidth;
}

const effectivePageSize = computed(() => {
  return isPortrait.value ? portraitPageSize : pageSize.value;
});
const totalPages = computed(() => Math.ceil(filteredAlumni.value.length / effectivePageSize.value));
const currentAlumni = computed(() => {
  const start = currentPage.value * effectivePageSize.value;
  return filteredAlumni.value.slice(start, start + effectivePageSize.value);
});

// 当前动态
const currentNews = computed(() => newsList.value[newsIndex.value] || null);


// --- 数据加载 ---
async function loadData() {
  loading.value = true;
  try {
    console.log('开始加载杰出校友数据...');
    const res = await contentApi.getDistinguished();
    console.log('API响应:', res.data);
    if (res.data.success) {
      alumniList.value = res.data.data;
      console.log('成功加载', alumniList.value.length, '位杰出校友');
    }
  } catch (e) {
    console.error('加载杰出校友失败:', e);
    // Mock数据用于演示
    alumniList.value = [
      { id: '1', alumni_id: '1', name: '张伟', category: '学术', graduation_year: 1985, achievement: '中国科学院院士，量子物理学家', photoUrl: '' },
      { id: '2', alumni_id: '2', name: '李明', category: '政界', graduation_year: 1978, achievement: '原省委书记，推动东北振兴', photoUrl: '' },
      { id: '3', alumni_id: '3', name: '王芳', category: '商界', graduation_year: 1992, achievement: '知名企业家，科技公司创始人', photoUrl: '' },
      { id: '4', alumni_id: '4', name: '刘洋', category: '文艺', graduation_year: 1988, achievement: '著名作家，茅盾文学奖获得者', photoUrl: '' },
      { id: '5', alumni_id: '5', name: '陈静', category: '医疗', graduation_year: 1990, achievement: '心血管专家，国家杰出青年', photoUrl: '' },
      { id: '6', alumni_id: '6', name: '赵强', category: '教育', graduation_year: 1982, achievement: '北京大学教授，教育改革先锋', photoUrl: '' },
    ];
  }

  // 加载校友动态
  try {
    const newsRes = await contentApi.getAlumniNews?.();
    if (newsRes?.data?.success) {
      newsList.value = newsRes.data.data;
    }
  } catch {
    // Mock动态数据
    newsList.value = [
      { id: '1', title: '张伟院士荣获国家最高科学技术奖', alumni_name: '张伟', date: '2024-12-10', type: 'award' },
      { id: '2', title: '李明校友捐资1000万建设校史馆', alumni_name: '李明', date: '2024-12-08', type: 'donation' },
      { id: '3', title: '王芳校友企业成功上市纳斯达克', alumni_name: '王芳', date: '2024-12-05', type: 'news' },
      { id: '4', title: '刘洋新作《归途》获茅盾文学奖提名', alumni_name: '刘洋', date: '2024-12-01', type: 'award' },
      { id: '5', title: '陈静教授团队攻克心脏支架难题', alumni_name: '陈静', date: '2024-11-28', type: 'news' },
    ];
  }
  
  loading.value = false;
  console.log('数据加载完成，loading状态:', loading.value);
}

// --- 交互逻辑 ---
function selectCategory(cat: string) {
  activeCategory.value = cat;
  currentPage.value = 0;
  resetIdleTimer();
}

function nextPage() {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++;
  } else {
    currentPage.value = 0;
  }
  resetIdleTimer();
}

function prevPage() {
  if (currentPage.value > 0) {
    currentPage.value--;
  } else {
    currentPage.value = totalPages.value - 1;
  }
  resetIdleTimer();
  resetAutoPlay(); // 手动翻页时重置自动播放计时器
}

function handleManualPageChange(page: number) {
  currentPage.value = page;
  resetIdleTimer();
  resetAutoPlay(); // 手动翻页时重置自动播放计时器
}

function viewDetail(alumni: Alumni) {
  router.push(`/alumni/${alumni.alumni_id}`);
}

function goBack() {
  router.push('/');
}

// --- 空闲检测（60秒返回首页）---
function resetIdleTimer() {
  if (idleTimer.value) clearTimeout(idleTimer.value);
  idleTimer.value = window.setTimeout(() => {
    router.push('/');
  }, 60000);
}

function handleUserActivity() {
  resetIdleTimer();
}

// --- 生命周期 ---
onMounted(() => {
  checkOrientation();
  window.addEventListener('resize', checkOrientation);
  loadData();
  resetIdleTimer();
  window.addEventListener('click', handleUserActivity);
  window.addEventListener('touchstart', handleUserActivity);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkOrientation);
  if (idleTimer.value) clearTimeout(idleTimer.value);
  window.removeEventListener('click', handleUserActivity);
  window.removeEventListener('touchstart', handleUserActivity);
});

// 获取类别背景颜色
function getCategoryBgColor(category: string) {
  const colorMap: Record<string, string> = {
    '状元榜': 'rgba(234, 179, 8, 0.2)',       // gold/yellow
    '革命烈士': 'rgba(239, 68, 68, 0.2)',     // red
    '政界': 'rgba(251, 191, 36, 0.2)',        // amber
    '学术': 'rgba(34, 211, 238, 0.2)',        // cyan
    '商界': 'rgba(52, 211, 153, 0.2)',        // emerald
    '文化': 'rgba(167, 139, 250, 0.2)',       // violet
    '医疗': 'rgba(251, 113, 133, 0.2)',       // rose
    '教育': 'rgba(96, 165, 250, 0.2)',        // blue
    '科技': 'rgba(129, 140, 248, 0.2)',       // indigo
    '体育': 'rgba(251, 146, 60, 0.2)',        // orange
    '军事': 'rgba(100, 116, 139, 0.2)',       // slate
  };
  return colorMap[category] || 'rgba(20, 184, 166, 0.2)'; // teal
}

// 获取类别文字颜色
function getCategoryTextColor(category: string) {
  const colorMap: Record<string, string> = {
    '状元榜': 'rgb(253, 224, 71)',         // yellow-300
    '革命烈士': 'rgb(252, 165, 165)',      // red-300
    '政界': 'rgb(252, 211, 77)',           // amber-300
    '学术': 'rgb(103, 232, 249)',          // cyan-300
    '商界': 'rgb(110, 231, 183)',          // emerald-300
    '文化': 'rgb(196, 181, 253)',          // violet-300
    '医疗': 'rgb(253, 164, 175)',          // rose-300
    '教育': 'rgb(147, 197, 253)',          // blue-300
    '科技': 'rgb(165, 180, 252)',          // indigo-300
    '体育': 'rgb(253, 186, 116)',          // orange-300
    '军事': 'rgb(148, 163, 184)',          // slate-300
  };
  return colorMap[category] || 'rgb(94, 234, 212)'; // teal-300
}

// 获取类别边框颜色
function getCategoryBorderColor(category: string) {
  const colorMap: Record<string, string> = {
    '状元榜': 'rgba(234, 179, 8, 0.3)',       // gold/yellow
    '革命烈士': 'rgba(239, 68, 68, 0.3)',     // red
    '政界': 'rgba(251, 191, 36, 0.3)',        // amber
    '学术': 'rgba(34, 211, 238, 0.3)',        // cyan
    '商界': 'rgba(52, 211, 153, 0.3)',        // emerald
    '文化': 'rgba(167, 139, 250, 0.3)',       // violet
    '医疗': 'rgba(251, 113, 133, 0.3)',       // rose
    '教育': 'rgba(96, 165, 250, 0.3)',        // blue
    '科技': 'rgba(129, 140, 248, 0.3)',       // indigo
    '体育': 'rgba(251, 146, 60, 0.3)',        // orange
    '军事': 'rgba(100, 116, 139, 0.3)',       // slate
  };
  return colorMap[category] || 'rgba(20, 184, 166, 0.3)'; // teal
}

// 获取动态类型图标
function getNewsIcon(type: string) {
  const icons: Record<string, string> = {
    award: '🏆',
    donation: '❤️',
    activity: '📅',
    news: '📰'
  };
  return icons[type] || '📰';
}
</script>


<template>
  <div class="relative w-full h-screen overflow-hidden bg-[#020608] text-white font-sans selection:bg-teal-500/30 pb-20">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div class="absolute inset-0 z-0 bg-gradient-to-b from-teal-900/5 via-transparent to-black/80 pointer-events-none"></div>
    
    <!-- 装饰光效 -->
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute bottom-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

    <div class="relative z-10 w-full h-full p-6 lg:p-10 flex flex-col">
      <!-- 顶部导航 -->
      <header class="flex items-center justify-between portrait:flex-col portrait:items-start portrait:gap-3 pb-4 border-b border-teal-500/20 shrink-0">
        <div class="flex items-center gap-6 portrait:gap-3">
          <button @click="goBack" class="group flex items-center gap-3 portrait:gap-2 text-white/60 hover:text-teal-400 transition-colors touch-target">
            <div class="w-10 h-10 portrait:w-9 portrait:h-9 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-teal-500/10 group-hover:border-teal-400/50 transition-all">
              <svg class="w-5 h-5 portrait:w-4 portrait:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span class="text-sm portrait:text-xs font-mono tracking-widest uppercase">返回首页</span>
          </button>
          <div>
            <h1 class="text-3xl portrait:text-2xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-100 to-white">杰出校友风采</h1>
            <p class="text-[10px] portrait:text-[8px] text-teal-200/40 font-mono tracking-[0.3em] uppercase portrait:hidden">Distinguished Alumni Hall of Fame</p>
          </div>
        </div>
        <div class="flex items-center gap-4 portrait:w-full portrait:justify-between">
          <div class="hidden md:flex portrait:!flex items-center gap-2 text-xs font-mono text-teal-200/30">
            <span class="w-2 h-2 bg-teal-500 rounded-full animate-pulse shadow-[0_0_10px_#14b8a6]"></span>
            共 {{ alumniList.length }} 位杰出校友
          </div>
          <ThemeToggle />
        </div>
      </header>

      <!-- 分类Tab - 竖屏时允许换行 -->
      <div class="flex items-center gap-3 portrait:gap-2 py-6 portrait:py-4 overflow-x-auto portrait:overflow-visible portrait:flex-wrap shrink-0">
        <button
          v-for="cat in CATEGORIES"
          :key="cat.name"
          @click="selectCategory(cat.name)"
          :class="[
            'px-5 py-2.5 portrait:px-3 portrait:py-2 rounded-full font-medium portrait:text-sm transition-all duration-300 flex items-center gap-2 portrait:gap-1.5 whitespace-nowrap touch-target',
            activeCategory === cat.name
              ? 'bg-teal-500/20 border border-teal-400/50 text-teal-300 shadow-lg shadow-teal-500/10'
              : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30 hover:text-white'
          ]"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.name }}</span>
          <span v-if="cat.name !== '全部'" class="text-xs opacity-60 portrait:hidden">
            ({{ alumniList.filter(a => a.category === cat.name).length }})
          </span>
        </button>
      </div>

      <!-- 校友卡片区域 -->
      <div 
        class="flex-1 min-h-0 relative"
        @touchstart="onTouchStart"
        @touchend="onTouchEnd"
        @scroll="onScroll"
      >
        <!-- 翻页按钮 - 竖屏时移到卡片区域外侧避免遮挡 -->
        <button
          v-if="totalPages > 1"
          @click="prevPage"
          class="absolute -left-2 portrait:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 portrait:w-8 portrait:h-8 rounded-full bg-black/80 border border-teal-500/50 flex items-center justify-center text-teal-400 hover:bg-teal-500/30 hover:border-teal-400 transition-all touch-target shadow-lg"
        >
          <svg class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          v-if="totalPages > 1"
          @click="nextPage"
          class="absolute -right-2 portrait:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 portrait:w-8 portrait:h-8 rounded-full bg-black/80 border border-teal-500/50 flex items-center justify-center text-teal-400 hover:bg-teal-500/30 hover:border-teal-400 transition-all touch-target shadow-lg"
        >
          <svg class="w-6 h-6 portrait:w-5 portrait:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- 卡片网格 - 增加边距避免按钮遮挡 -->
        <div class="h-full px-20 portrait:px-16 overflow-hidden portrait:overflow-y-auto">
          <transition name="slide-fade" mode="out-in">
            <div :key="currentPage" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 portrait:!grid-cols-3 portrait:!grid-rows-2 gap-6 portrait:gap-4 portrait:h-full content-center">
              <div
                v-for="(alumni, index) in currentAlumni"
                :key="alumni.id"
                @click="viewDetail(alumni)"
                class="alumni-card group cursor-pointer"
                :style="{ animationDelay: `${index * 80}ms` }"
              >
                <!-- 卡片内容 - 高度由内容自然决定 -->
                <div class="relative h-auto rounded-2xl overflow-hidden transition-all duration-500 flex flex-col group" style="background: linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.1);">
                  <!-- 光泽边框效果 -->
                  <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style="background: linear-gradient(135deg, rgba(20,184,166,0.3) 0%, transparent 40%, transparent 60%, rgba(20,184,166,0.2) 100%); padding: 1px;">
                    <div class="w-full h-full rounded-2xl" style="background: linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);"></div>
                  </div>
                  <!-- 边框高光 -->
                  <div class="absolute -inset-[1px] rounded-2xl opacity-60" style="background: linear-gradient(135deg, rgba(20,184,166,0.4) 0%, transparent 30%, transparent 70%, rgba(20,184,166,0.3) 100%); z-index: -1;"></div>
                  <!-- 顶部装饰线 -->
                  <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <!-- 照片区域 - 竖版比例 3:4，约占卡片高度78% -->
                  <div class="relative aspect-[3/4] bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden">
                    <img
                      v-if="alumni.photoUrl"
                      :src="alumni.photoUrl"
                      :alt="alumni.name"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-900/50 to-cyan-900/50">
                      <span class="text-4xl font-bold text-teal-500/30 text-center px-2 break-all">{{ alumni.name }}</span>
                    </div>
                    
                    <!-- 类别标签 -->
                    <div class="absolute top-3 left-3">
                      <span 
                        class="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md border"
                        :style="{
                          backgroundColor: getCategoryBgColor(alumni.category),
                          color: getCategoryTextColor(alumni.category),
                          borderColor: getCategoryBorderColor(alumni.category)
                        }"
                      >
                        {{ alumni.category }}
                      </span>
                    </div>

                    <!-- 届别标签 -->
                    <div class="absolute top-3 right-3">
                      <span class="px-2 py-1 rounded bg-black/60 text-white/80 text-xs font-mono backdrop-blur-md">
                        {{ alumni.graduation_year }}届
                      </span>
                    </div>
                  </div>

                  <!-- 信息区域 - 约占卡片高度22% -->
                  <div class="h-[22%] min-h-[50px] p-2 flex flex-col justify-center bg-gradient-to-t from-black/40 to-transparent">
                    <h3 class="text-base font-bold text-white mb-1 group-hover:text-teal-300 transition-colors truncate">
                      {{ alumni.name }}
                    </h3>
                    <p class="text-xs text-gray-400 line-clamp-2 leading-snug">
                      {{ alumni.achievement || '杰出校友' }}
                    </p>
                  </div>

                  <!-- 悬停时的发光边框 -->
                  <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" style="box-shadow: inset 0 0 20px rgba(20,184,166,0.3), 0 0 30px rgba(20,184,166,0.2);"></div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- 分页指示器 - 移到卡片区域下方，不遮挡卡片 -->
        <div v-if="totalPages > 1" class="mt-6 portrait:mt-4 flex items-center justify-center gap-2 portrait:gap-3">
          <button
            v-for="page in totalPages"
            :key="page"
            @click="handleManualPageChange(page - 1)"
            :class="[
              'w-2 h-2 portrait:w-3 portrait:h-3 rounded-full transition-all touch-target',
              currentPage === page - 1
                ? 'w-8 portrait:w-10 bg-teal-500 shadow-[0_0_10px_#14b8a6]'
                : 'bg-white/20 hover:bg-white/40'
            ]"
          ></button>
        </div>
      </div>


      <!-- 校友动态走马灯 - 竖屏时简化布局 -->
      <div 
        class="shrink-0 mt-6 portrait:mt-4 pt-6 portrait:pt-4 border-t border-teal-500/20"
        @touchstart="onNewsTouchStart"
        @touchend="onNewsTouchEnd"
      >
        <div class="flex items-center gap-4 portrait:gap-2 portrait:flex-col portrait:items-stretch">
          <div class="flex items-center gap-2 shrink-0 portrait:justify-between portrait:w-full">
            <div class="flex items-center gap-2">
              <span class="text-teal-400 text-lg portrait:text-base">📰</span>
              <span class="text-sm portrait:text-xs font-bold text-teal-300 font-mono tracking-wider">校友动态</span>
            </div>
            <!-- 动态导航 - 竖屏时移到标题旁边 -->
            <div class="hidden portrait:flex items-center gap-2">
              <button
                @click="newsIndex = (newsIndex - 1 + newsList.length) % newsList.length"
                class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-teal-400 hover:border-teal-400/50 transition-all touch-target"
              >
                ‹
              </button>
              <button
                @click="newsIndex = (newsIndex + 1) % newsList.length"
                class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-teal-400 hover:border-teal-400/50 transition-all touch-target"
              >
                ›
              </button>
            </div>
          </div>
          
          <div class="flex-1 overflow-hidden portrait:w-full">
            <transition name="news-slide" mode="out-in">
              <div v-if="currentNews" :key="currentNews.id" class="flex items-center gap-4 portrait:gap-3 glass-card px-6 portrait:px-4 py-3 portrait:py-2.5 rounded-xl">
                <span class="text-2xl portrait:text-xl">{{ getNewsIcon(currentNews.type) }}</span>
                <div class="flex-1 min-w-0">
                  <p class="text-white portrait:text-sm font-medium truncate">{{ currentNews.title }}</p>
                  <p class="text-xs text-teal-400/60 mt-1">
                    {{ currentNews.alumni_name }} · {{ currentNews.date }}
                  </p>
                </div>
                <div class="shrink-0 text-teal-500/50 text-xs font-mono">
                  {{ newsIndex + 1 }}/{{ newsList.length }}
                </div>
              </div>
            </transition>
          </div>

          <!-- 动态导航 - 横屏时显示 -->
          <div class="flex items-center gap-2 shrink-0 portrait:hidden">
            <button
              @click="newsIndex = (newsIndex - 1 + newsList.length) % newsList.length"
              class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-teal-400 hover:border-teal-400/50 transition-all"
            >
              ‹
            </button>
            <button
              @click="newsIndex = (newsIndex + 1) % newsList.length"
              class="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-teal-400 hover:border-teal-400/50 transition-all"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="absolute inset-0 bg-[#020608] flex items-center justify-center z-50">
      <div class="text-center">
        <div class="w-12 h-12 border-2 border-teal-500/20 border-t-teal-400 rounded-full animate-spin mx-auto mb-4 shadow-[0_0_15px_rgba(45,212,191,0.2)]"></div>
        <div class="text-teal-400/60 animate-pulse font-mono tracking-[0.3em] text-xs">加载杰出校友...</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && filteredAlumni.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center">
        <div class="text-6xl mb-4 opacity-30">🎓</div>
        <p class="text-white/30">暂无该类别的杰出校友</p>
      </div>
    </div>
    
    <!-- 自动播放暂停指示器 -->
    <AutoScrollPause :is-paused="isAutoPlayPaused ?? false" />
    
    <!-- 底部导航栏 -->
    <BottomNavigation />
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10;
}

.alumni-card {
  animation: fadeInUp 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 页面切换动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.4s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 新闻切换动画 */
.news-slide-enter-active,
.news-slide-leave-active {
  transition: all 0.3s ease;
}

.news-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.news-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 行数限制 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

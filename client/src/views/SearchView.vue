<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api';
import { contentApi } from '@/api';
import { useNavigationStore } from '@/stores/navigation';
import AIChatDialog from '@/components/AIChatDialog.vue';
import BottomNavigation from '@/components/BottomNavigation.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useThemeStore } from '@/stores/theme';
import { useSwipe } from '@/composables/useSwipe';

// AI 对话弹窗状态
const showAIChat = ref(false);

// --- 核心状态 ---
const router = useRouter();
const navigationStore = useNavigationStore();

// 下拉刷新手势
const { swipeHandlers: searchSwipeHandlers } = useSwipe({
  pullDownThreshold: 80,
  onPullDown: () => handleSearch(),
});
const themeStore = useThemeStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 主题相关
const isDark = computed(() => themeStore.isDark);

// 是否已执行搜索（区分欢迎界面和搜索结果）
const hasSearched = ref(false);

// 搜索条件状态
const searchForm = reactive({
  keyword: '',
  yearStart: 1917,
  yearEnd: 2024,
  selectedClass: '',
  selectedIndustry: ''
});

const isSearching = ref(false);

// 搜索结果
const searchResults = ref<any[]>([]);

// 推荐校友（有照片的杰出校友）
const featuredAlumni = ref<any[]>([]);

// 筛选选项
const classOptions = ref<string[]>([]);
const industryOptions = ref(['教育', '科技', '医疗', '金融', '文化', '政府', '军事', '其他']);

// --- 业务逻辑 ---
// 加载筛选选项
const loadFilterOptions = async () => {
  try {
    const res = await api.get('/alumni/filters');
    if (res.data.success) {
      classOptions.value = res.data.data.classes || [];
      if (res.data.data.industries?.length) {
        industryOptions.value = res.data.data.industries;
      }
    }
  } catch (e) {
    console.warn('加载筛选选项失败:', e);
  }
};

// 加载推荐校友（有照片的杰出校友）
const loadFeaturedAlumni = async () => {
  try {
    const res = await contentApi.getDistinguished();
    if (res.data.success) {
      // 筛选有照片的校友，取前6个
      featuredAlumni.value = res.data.data
        .filter((a: any) => a.photoUrl)
        .slice(0, 6);
    }
  } catch (e) {
    console.warn('加载推荐校友失败:', e);
  }
};

// 执行组合搜索
const handleSearch = async () => {
  hasSearched.value = true;
  isSearching.value = true;
  try {
    const res = await api.get('/alumni/search', {
      params: {
        keyword: searchForm.keyword,
        yearStart: searchForm.yearStart,
        yearEnd: searchForm.yearEnd,
        className: searchForm.selectedClass,
        industry: searchForm.selectedIndustry
      }
    });
    if (res.data.success) {
      searchResults.value = res.data.data.items || res.data.data || [];
    }
  } catch (e) {
    console.error('搜索失败:', e);
  } finally {
    isSearching.value = false;
  }
};

// 从AI对话中选择校友
const handleAISelectAlumni = (alumni: any) => {
  showAIChat.value = false;
  viewDetail(alumni.id);
};

const viewDetail = (id: string) => {
  navigationStore.enterDetail('search', '/search');
  router.push(`/alumni/${id}`);
};

const goBack = () => {
  router.push('/');
};

// --- Canvas 粒子背景 ---
let animationFrameId: number;
function initBackground() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const particles: any[] = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2
    });
  }

  function animate() {
    ctx!.fillStyle = themeStore.isDark ? '#020608' : '#faf8f5';
    ctx!.fillRect(0, 0, width, height);
    ctx!.fillStyle = themeStore.isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(139, 37, 0, 0.2)';

    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx!.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
        if (d < 150) {
          ctx!.beginPath();
          ctx!.strokeStyle = themeStore.isDark 
            ? `rgba(20, 184, 166, ${0.15 * (1 - d / 150)})`
            : `rgba(139, 37, 0, ${0.1 * (1 - d / 150)})`;
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p2.x, p2.y);
          ctx!.stroke();
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
  initBackground();
  loadFilterOptions();
  loadFeaturedAlumni();
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <div 
    class="relative w-full min-h-screen overflow-hidden font-sans pb-20 transition-colors duration-300"
    :class="isDark ? 'bg-[#020608] text-white selection:bg-teal-500/30' : 'bg-[#faf8f5] text-[#2d1810] selection:bg-[#8b2500]/20'"
  >
    <!-- Canvas 粒子背景 -->
    <canvas ref="canvasRef" class="absolute inset-0 z-0"></canvas>
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div 
      class="absolute inset-0 z-0 pointer-events-none transition-colors duration-300"
      :class="isDark ? 'bg-gradient-to-b from-transparent via-transparent to-black/80' : 'bg-gradient-to-b from-transparent via-transparent to-[#f5f0ea]/80'"
    ></div>

    <div class="relative z-10 w-full p-6 lg:p-10 flex flex-col h-screen" v-on="searchSwipeHandlers">
      <!-- 顶部导航 -->
      <header 
        class="flex items-center justify-between portrait:flex-col portrait:items-start portrait:gap-3 mb-8 portrait:mb-4 pb-4 border-b shrink-0 transition-colors duration-300"
        :class="isDark ? 'border-teal-500/20' : 'border-[#8b2500]/20'"
      >
        <div class="flex items-center gap-6 portrait:gap-3">
          <button 
            @click="goBack" 
            class="group flex items-center gap-3 portrait:gap-2 transition-colors touch-target"
            :class="isDark ? 'text-white/60 hover:text-teal-400' : 'text-[#2d1810]/60 hover:text-[#8b2500]'"
          >
            <div 
              class="w-10 h-10 portrait:w-9 portrait:h-9 rounded-full border flex items-center justify-center transition-all"
              :class="isDark ? 'border-white/20 group-hover:bg-white/10 group-hover:border-teal-400/50' : 'border-[#8b2500]/20 group-hover:bg-[#8b2500]/10 group-hover:border-[#8b2500]/50'"
            >
              <svg class="w-5 h-5 portrait:w-4 portrait:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span class="text-sm portrait:text-xs font-mono tracking-widest uppercase">返回首页</span>
          </button>
          <div>
            <h1 
              class="text-3xl portrait:text-2xl font-bold tracking-wide text-transparent bg-clip-text"
              :class="isDark ? 'bg-gradient-to-r from-teal-300 to-cyan-500' : 'bg-gradient-to-r from-[#8b2500] to-[#a63c1c]'"
            >智能查询</h1>
            <p class="text-xs transition-colors duration-300 portrait:hidden"
              :class="isDark ? 'text-teal-200/50' : 'text-[#8b2500]/50'"
              style="font-family: monospace; letter-spacing: 0.3em; text-transform: uppercase;"
            >Alumni Database Query System</p>
          </div>
        </div>
        <div 
          class="hidden md:flex portrait:!hidden items-center gap-4 text-xs font-mono"
          :class="isDark ? 'text-teal-500/50' : 'text-[#8b2500]/50'"
        >
          <span class="w-2 h-2 rounded-full animate-pulse" :class="isDark ? 'bg-teal-500' : 'bg-[#8b2500]'"></span>
          DATABASE CONNECTION: STABLE
          <ThemeToggle />
        </div>
      </header>

      <!-- 主内容区 -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 portrait:!grid-cols-1 gap-8 portrait:gap-4 min-h-0 portrait:flex portrait:flex-col">
        <!-- 左侧：搜索面板 -->
        <aside class="lg:col-span-3 portrait:order-1 flex flex-col gap-4 portrait:gap-3 overflow-y-auto portrait:overflow-visible pr-2 portrait:pr-0 custom-scrollbar portrait:shrink-0 portrait:max-h-none">
          <!-- AI 智能助手入口 -->
          <button 
            @click="showAIChat = true"
            class="glass-card p-4 rounded-2xl relative overflow-visible group cursor-pointer hover:bg-teal-500/10 hover:border-teal-400/30 transition-all text-left w-full shrink-0"
          >
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-60 rounded-t-2xl"></div>
            <div class="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
            <div class="relative z-10 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:shadow-teal-500/50 transition-shadow shrink-0">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold tracking-wide group-hover:text-teal-300 transition-colors" :class="isDark ? 'text-white' : 'text-[#2d1810]'">AI 智能助手</h3>
                  <p class="text-xs text-gray-500">自然语言查询</p>
                </div>
              </div>
              <svg class="w-5 h-5 text-teal-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <!-- 精确筛选 -->
          <div class="glass-card p-6 portrait:p-4 rounded-2xl flex-1 portrait:flex-none">
            <div class="flex items-center gap-2 mb-6 portrait:mb-4">
              <span class="text-xl portrait:text-lg">⚡</span>
              <h3 class="font-bold tracking-wide portrait:text-sm" :class="isDark ? 'text-white' : 'text-[#2d1810]'">精确筛选</h3>
            </div>
            <div class="space-y-5 portrait:space-y-3 portrait:grid portrait:grid-cols-2 portrait:gap-3 portrait:space-y-0">
              <!-- 姓名/学号 -->
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase" :class="isDark ? 'text-teal-200/70' : 'text-[#8b2500]/70'">姓名 / 学号</label>
                <div class="relative">
                  <input
                    v-model="searchForm.keyword"
                    type="text"
                    placeholder="输入姓名或学号..."
                    class="w-full h-10 border rounded-lg px-3 text-sm focus:outline-none transition-colors"
                    :class="isDark ? 'bg-black/40 border-white/10 text-white focus:border-teal-500/50' : 'bg-white/60 border-[#8b2500]/20 text-[#2d1810] focus:border-[#8b2500]/50'"
                  />
                  <svg class="absolute right-3 top-2.5 w-4 h-4" :class="isDark ? 'text-white/30' : 'text-[#8b2500]/30'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <!-- 届别范围 -->
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase" :class="isDark ? 'text-teal-200/70' : 'text-[#8b2500]/70'">届别范围</label>
                <div class="flex items-center gap-2">
                  <input type="number" v-model="searchForm.yearStart" class="w-full border rounded p-2 text-xs text-center" :class="isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white/60 border-[#8b2500]/20 text-[#2d1810]'" />
                  <span :class="isDark ? 'text-white/30' : 'text-[#8b2500]/30'">-</span>
                  <input type="number" v-model="searchForm.yearEnd" class="w-full border rounded p-2 text-xs text-center" :class="isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white/60 border-[#8b2500]/20 text-[#2d1810]'" />
                </div>
              </div>

              <!-- 班级 -->
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase" :class="isDark ? 'text-teal-200/70' : 'text-[#8b2500]/70'">班级</label>
                <select v-model="searchForm.selectedClass" class="w-full h-10 border rounded-lg px-2 text-sm outline-none" :class="isDark ? 'bg-black/40 border-white/10 text-gray-300 focus:border-teal-500/50' : 'bg-white/60 border-[#8b2500]/20 text-[#2d1810] focus:border-[#8b2500]/50'">
                  <option value="" :class="isDark ? 'bg-gray-900' : 'bg-white'">全部班级</option>
                  <option v-for="cls in classOptions" :key="cls" :value="cls" :class="isDark ? 'bg-gray-900' : 'bg-white'">{{ cls }}</option>
                </select>
              </div>

              <!-- 行业 -->
              <div class="space-y-2">
                <label class="text-xs font-mono uppercase" :class="isDark ? 'text-teal-200/70' : 'text-[#8b2500]/70'">行业领域</label>
                <select v-model="searchForm.selectedIndustry" class="w-full h-10 border rounded-lg px-2 text-sm outline-none" :class="isDark ? 'bg-black/40 border-white/10 text-gray-300 focus:border-teal-500/50' : 'bg-white/60 border-[#8b2500]/20 text-[#2d1810] focus:border-[#8b2500]/50'">
                  <option value="" :class="isDark ? 'bg-gray-900' : 'bg-white'">全部行业</option>
                  <option v-for="ind in industryOptions" :key="ind" :value="ind" :class="isDark ? 'bg-gray-900' : 'bg-white'">{{ ind }}</option>
                </select>
              </div>

              <button
                @click="handleSearch"
                :disabled="isSearching"
                class="w-full py-3 portrait:py-2.5 mt-4 portrait:mt-0 portrait:col-span-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold portrait:font-semibold rounded-lg shadow-lg shadow-teal-500/20 transition-all active:scale-95 tracking-wide disabled:opacity-50 touch-target"
              >
                {{ isSearching ? '搜索中...' : '开始搜索' }}
              </button>
            </div>
          </div>
        </aside>

        <!-- 右侧：欢迎界面或搜索结果 -->
        <main class="lg:col-span-9 portrait:order-2 flex flex-col min-h-0 portrait:flex-1">
          <!-- 欢迎界面（未搜索时显示） -->
          <div v-if="!hasSearched" class="flex-1 overflow-y-auto pr-2 portrait:pr-0 custom-scrollbar">
            <!-- 欢迎标题 -->
            <div class="text-center mb-8 portrait:mb-6">
              <h2 class="text-2xl portrait:text-xl font-bold mb-2" :class="isDark ? 'text-white' : 'text-[#2d1810]'">
                欢迎使用校友查询系统
              </h2>
              <p class="text-sm" :class="isDark ? 'text-teal-200/60' : 'text-[#8b2500]/60'">
                搜索校友信息，或使用 AI 智能助手进行自然语言查询
              </p>
            </div>

            <!-- 功能提示卡片 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 portrait:mb-6">
              <!-- AI 助手提示 -->
              <div 
                class="glass-card p-5 rounded-xl cursor-pointer group hover:border-teal-400/30 transition-all"
                @click="showAIChat = true"
              >
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span class="text-2xl">🤖</span>
                </div>
                <h3 class="font-bold mb-2" :class="isDark ? 'text-white' : 'text-[#2d1810]'">AI 智能助手</h3>
                <p class="text-xs" :class="isDark ? 'text-gray-400' : 'text-[#8b2500]/60'">
                  用自然语言描述您要查找的校友，如"找一位从事医疗行业的90年代校友"
                </p>
              </div>

              <!-- 精确搜索提示 -->
              <div class="glass-card p-5 rounded-xl">
                <div class="w-12 h-12 rounded-full flex items-center justify-center mb-4" :class="isDark ? 'bg-purple-500/20' : 'bg-[#8b2500]/10'">
                  <span class="text-2xl">🔍</span>
                </div>
                <h3 class="font-bold mb-2" :class="isDark ? 'text-white' : 'text-[#2d1810]'">精确搜索</h3>
                <p class="text-xs" :class="isDark ? 'text-gray-400' : 'text-[#8b2500]/60'">
                  输入姓名、学号，或按届别、班级、行业等条件筛选校友
                </p>
              </div>

              <!-- 浏览提示 -->
              <div class="glass-card p-5 rounded-xl">
                <div class="w-12 h-12 rounded-full flex items-center justify-center mb-4" :class="isDark ? 'bg-amber-500/20' : 'bg-[#8b2500]/10'">
                  <span class="text-2xl">⭐</span>
                </div>
                <h3 class="font-bold mb-2" :class="isDark ? 'text-white' : 'text-[#2d1810]'">杰出校友</h3>
                <p class="text-xs" :class="isDark ? 'text-gray-400' : 'text-[#8b2500]/60'">
                  浏览下方推荐的杰出校友，了解他们的成就与故事
                </p>
              </div>
            </div>

            <!-- 推荐校友 -->
            <div v-if="featuredAlumni.length > 0">
              <div class="flex items-center gap-3 mb-4">
                <span class="text-xl">🏆</span>
                <h3 class="font-bold" :class="isDark ? 'text-white' : 'text-[#2d1810]'">杰出校友推荐</h3>
                <span class="text-xs px-2 py-0.5 rounded-full" :class="isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-[#8b2500]/10 text-[#8b2500]'">
                  精选 {{ featuredAlumni.length }} 位
                </span>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <div
                  v-for="alumni in featuredAlumni"
                  :key="alumni.alumni_id"
                  @click="viewDetail(alumni.alumni_id)"
                  class="glass-card rounded-xl p-4 cursor-pointer group hover:border-teal-400/30 hover:-translate-y-1 transition-all text-center"
                >
                  <div class="w-20 h-20 mx-auto rounded-full overflow-hidden border-2 mb-3 group-hover:border-teal-400 transition-colors" :class="isDark ? 'border-white/10' : 'border-[#8b2500]/20'">
                    <img :src="alumni.photoUrl" :alt="alumni.name" class="w-full h-full object-cover" />
                  </div>
                  <h4 class="font-bold text-sm mb-1 group-hover:text-teal-400 transition-colors" :class="isDark ? 'text-white' : 'text-[#2d1810]'">{{ alumni.name }}</h4>
                  <p class="text-xs mb-2" :class="isDark ? 'text-gray-400' : 'text-[#8b2500]/60'">{{ alumni.graduation_year }}届</p>
                  <span class="text-xs px-2 py-0.5 rounded-full" :class="isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-[#8b2500]/10 text-[#8b2500]'">
                    {{ alumni.category }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 搜索结果（搜索后显示） -->
          <template v-else>
            <div class="flex justify-between items-end mb-4 portrait:mb-3 px-2 portrait:px-0">
              <div>
                <h2 class="text-lg portrait:text-base font-bold" :class="isDark ? 'text-white' : 'text-[#2d1810]'">搜索结果</h2>
                <p class="text-xs font-mono mt-1" :class="isDark ? 'text-teal-500/60' : 'text-[#8b2500]/60'">找到 {{ searchResults.length }} 条匹配记录</p>
              </div>
              <button 
                @click="hasSearched = false; searchResults = []"
                class="text-xs px-3 py-1.5 rounded-lg transition-colors"
                :class="isDark ? 'text-teal-400 hover:bg-teal-500/10' : 'text-[#8b2500] hover:bg-[#8b2500]/10'"
              >
                返回首页
              </button>
            </div>

            <div class="flex-1 overflow-y-auto pr-2 portrait:pr-0 custom-scrollbar">
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 portrait:!grid-cols-1 portrait-md:!grid-cols-2 gap-4 portrait:gap-3">
                <div
                  v-for="(item, index) in searchResults"
                  :key="item.id"
                  @click="viewDetail(item.id)"
                  class="glass-card-hover glass-card rounded-xl p-5 cursor-pointer relative group overflow-hidden"
                  :style="{ animationDelay: `${index * 50}ms` }"
                >
                  <div class="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div class="flex items-start gap-4 relative z-10">
                    <!-- 头像 -->
                    <div class="relative">
                      <div class="w-16 h-16 rounded-full border-2 overflow-hidden transition-colors" :class="isDark ? 'bg-gray-800 border-white/10 group-hover:border-teal-400' : 'bg-white border-[#8b2500]/20 group-hover:border-[#8b2500]'">
                        <img v-if="item.photoUrl" :src="item.photoUrl" class="w-full h-full object-cover" @error="(e) => (e.target as HTMLImageElement).style.display = 'none'" />
                        <div v-else class="w-full h-full flex items-center justify-center text-white font-bold text-xl" :class="isDark ? 'bg-gradient-to-b from-teal-700 to-teal-900' : 'bg-gradient-to-b from-[#8b2500] to-[#a63c1c]'">
                          {{ item.name?.[0] || '?' }}
                        </div>
                      </div>
                      <div class="absolute bottom-0 right-0 w-4 h-4 rounded-full flex items-center justify-center" :class="isDark ? 'bg-black' : 'bg-white'">
                        <div class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(20,184,166,0.8)]" :class="isDark ? 'bg-teal-500' : 'bg-[#8b2500]'"></div>
                      </div>
                    </div>
                    <!-- 信息 -->
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start">
                        <h3 class="text-lg font-bold group-hover:text-teal-300 transition-colors truncate" :class="isDark ? 'text-white' : 'text-[#2d1810]'">{{ item.name }}</h3>
                        <span class="text-xs px-2 py-0.5 rounded border font-mono" :class="isDark ? 'border-teal-500/20 bg-teal-500/10 text-teal-300' : 'border-[#8b2500]/20 bg-[#8b2500]/10 text-[#8b2500]'">{{ item.graduationYear }}届</span>
                      </div>
                      <div class="mt-2 space-y-1">
                        <p v-if="item.className" class="text-xs flex items-center gap-2" :class="isDark ? 'text-gray-400' : 'text-[#8b2500]/60'">
                          <span class="w-1 h-1 rounded-full" :class="isDark ? 'bg-teal-500/50' : 'bg-[#8b2500]/50'"></span>{{ item.className }}
                        </p>
                        <p v-if="item.industry" class="text-xs flex items-center gap-2" :class="isDark ? 'text-gray-400' : 'text-[#8b2500]/60'">
                          <span class="w-1 h-1 rounded-full" :class="isDark ? 'bg-teal-500/50' : 'bg-[#8b2500]/50'"></span>{{ item.industry }}
                        </p>
                        <p v-if="item.currentCity" class="text-xs flex items-center gap-2" :class="isDark ? 'text-gray-400' : 'text-[#8b2500]/60'">
                          <span class="w-1 h-1 rounded-full" :class="isDark ? 'bg-teal-500/50' : 'bg-[#8b2500]/50'"></span>{{ item.currentCity }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <!-- 标签 -->
                  <div v-if="item.extraInfo?.category" class="mt-4 pt-3 border-t" :class="isDark ? 'border-white/5' : 'border-[#8b2500]/10'">
                    <span class="text-xs px-2 py-1 rounded border" :class="isDark ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-[#8b2500]/10 text-[#8b2500] border-[#8b2500]/20'">{{ item.extraInfo.category }}</span>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-if="searchResults.length === 0 && !isSearching" class="h-64 flex flex-col items-center justify-center" :class="isDark ? 'text-white/50' : 'text-[#8b2500]/50'">
                <svg class="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>暂无匹配的校友记录</p>
                <p class="text-xs mt-2">尝试调整搜索条件或使用 AI 智能助手</p>
              </div>
            </div>
          </template>
        </main>
      </div>
    </div>

    <!-- AI 对话弹窗 -->
    <AIChatDialog 
      :visible="showAIChat" 
      @close="showAIChat = false"
      @select-alumni="handleAISelectAlumni"
    />
    
    <!-- 底部导航栏 -->
    <BottomNavigation />
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl;
}

.glass-card-hover {
  @apply transition-all duration-300 hover:bg-white/10 hover:border-teal-400/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(20,184,166,0.15)];
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

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(20, 184, 166, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(20, 184, 166, 0.5);
}
</style>

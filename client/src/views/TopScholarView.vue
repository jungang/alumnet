<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { contentApi } from '@/api';
import BottomNavigation from '@/components/BottomNavigation.vue';
import AutoScrollPause from '@/components/AutoScrollPause.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useAutoRefresh } from '@/composables/useAutoRefresh';
import { useThemeStore } from '@/stores/theme';

interface TopScholar {
  id: string;
  name: string;
  examYear: number;
  rankDescription: string;
  university?: string;
  major?: string;
  score?: number;
  photoUrl?: string;
  biography?: string;
}

const router = useRouter();
const themeStore = useThemeStore();
const loading = ref(true);
const scholars = ref<TopScholar[]>([]);
const currentPage = ref(0);
const idleTimer = ref<number | null>(null);
const selectedScholar = ref<TopScholar | null>(null);

const { isPaused: isAutoPlayPaused, reset: resetAutoPlay, onTouchStart, onTouchEnd } = useAutoRefresh({
  interval: 6000,
  pauseDelay: 8000,
  onRefresh: () => nextPage(),
  autoStart: true,
});

const pageSize = 6;
const totalPages = computed(() => Math.ceil(scholars.value.length / pageSize));
const currentScholars = computed(() => {
  const start = currentPage.value * pageSize;
  return scholars.value.slice(start, start + pageSize);
});

const isDark = computed(() => themeStore.isDark);

async function loadData() {
  loading.value = true;
  try {
    const res = await contentApi.getTopScholars();
    if (res.data.success) {
      scholars.value = res.data.data;
    }
  } catch (e) {
    console.error('加载状元榜失败:', e);
    scholars.value = [];
  }
  loading.value = false;
}

function nextPage() {
  if (totalPages.value <= 1) return;
  currentPage.value = (currentPage.value + 1) % totalPages.value;
  resetIdleTimer();
}

function prevPage() {
  if (totalPages.value <= 1) return;
  currentPage.value = (currentPage.value - 1 + totalPages.value) % totalPages.value;
  resetIdleTimer();
  resetAutoPlay();
}

function goToPage(page: number) {
  currentPage.value = page;
  resetIdleTimer();
  resetAutoPlay();
}

function viewDetail(scholar: TopScholar) {
  selectedScholar.value = scholar;
  resetIdleTimer();
  resetAutoPlay();
}

function closeDetail() {
  selectedScholar.value = null;
  resetIdleTimer();
}

function goBack() {
  router.push('/');
}

function resetIdleTimer() {
  if (idleTimer.value) clearTimeout(idleTimer.value);
  idleTimer.value = window.setTimeout(() => router.push('/'), 60000);
}

onMounted(() => {
  loadData();
  resetIdleTimer();
  window.addEventListener('click', resetIdleTimer);
  window.addEventListener('touchstart', resetIdleTimer);
});

onUnmounted(() => {
  if (idleTimer.value) clearTimeout(idleTimer.value);
  window.removeEventListener('click', resetIdleTimer);
  window.removeEventListener('touchstart', resetIdleTimer);
});
</script>

<template>
  <div 
    class="relative w-full h-screen overflow-hidden"
    :class="isDark ? 'bg-gradient-to-br from-gray-900 via-red-900/20 to-yellow-900/20' : 'bg-gradient-to-br from-amber-50 via-red-50 to-yellow-50'"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- 背景装饰 -->
    <div class="absolute inset-0 opacity-10">
      <div class="absolute top-10 left-10 w-64 h-64 bg-gradient-to-br from-red-500 to-yellow-500 rounded-full blur-3xl"></div>
      <div class="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-br from-yellow-500 to-red-500 rounded-full blur-3xl"></div>
    </div>

    <!-- 顶部标题栏 -->
    <header 
      class="relative z-10 flex items-center justify-between p-6 portrait:p-4"
      :class="isDark ? 'bg-black/30 backdrop-blur-sm border-b border-red-500/20' : 'bg-white/30 backdrop-blur-sm border-b border-red-300/30'"
    >
      <button 
        @click="goBack"
        class="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
        :class="isDark ? 'bg-red-900/50 text-red-200 hover:bg-red-800/70' : 'bg-red-100 text-red-800 hover:bg-red-200'"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span class="portrait:hidden">返回首页</span>
      </button>

      <div class="flex items-center gap-4">
        <h1 
          class="text-3xl portrait:text-2xl font-bold bg-clip-text text-transparent"
          :class="isDark ? 'bg-gradient-to-r from-red-400 via-yellow-400 to-red-400' : 'bg-gradient-to-r from-red-600 via-yellow-600 to-red-600'"
        >
          🏆 高考状元榜
        </h1>
      </div>

      <div class="flex items-center gap-3">
        <AutoScrollPause :is-paused="isAutoPlayPaused ?? false" />
        <ThemeToggle />
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="relative z-10 h-[calc(100vh-140px)] portrait:h-[calc(100vh-120px)] p-8 portrait:p-4 overflow-y-auto">
      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div 
            class="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            :class="isDark ? 'border-red-500' : 'border-red-600'"
          ></div>
          <p :class="isDark ? 'text-red-300' : 'text-red-700'">加载中...</p>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="scholars.length === 0" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="text-6xl mb-4">🏆</div>
          <p :class="isDark ? 'text-gray-400' : 'text-gray-600'">暂无状元数据</p>
        </div>
      </div>

      <!-- 状元卡片网格 -->
      <div v-else class="grid grid-cols-3 portrait:grid-cols-2 gap-6 portrait:gap-4">
        <div
          v-for="scholar in currentScholars"
          :key="scholar.id"
          @click="viewDetail(scholar)"
          class="group relative cursor-pointer transition-all duration-500 hover:scale-105"
        >
          <div 
            class="relative overflow-hidden rounded-2xl shadow-2xl"
            :class="isDark ? 'bg-gradient-to-br from-red-900/80 to-yellow-900/80 backdrop-blur-sm' : 'bg-gradient-to-br from-red-50 to-yellow-50'"
          >
            <!-- 金色光晕效果 -->
            <div class="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-red-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <!-- 照片 -->
            <div class="relative aspect-[3/4] overflow-hidden">
              <img
                v-if="scholar.photoUrl"
                :src="scholar.photoUrl"
                :alt="scholar.name"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center"
                :class="isDark ? 'bg-gradient-to-br from-red-800 to-yellow-800' : 'bg-gradient-to-br from-red-200 to-yellow-200'"
              >
                <span class="text-4xl font-bold text-center px-2 break-all" :class="isDark ? 'text-yellow-500/30' : 'text-red-800/30'">
                  {{ scholar.name }}
                </span>
              </div>
              
              <!-- 年份和分数标签 -->
              <div class="absolute top-4 left-4">
                <span 
                  class="px-3 py-1 rounded-full text-sm font-bold shadow-lg"
                  :class="isDark ? 'bg-yellow-600/90 text-gray-900' : 'bg-yellow-400 text-gray-900'"
                >
                  {{ scholar.examYear }}年
                </span>
              </div>
              <div v-if="scholar.score" class="absolute top-4 right-4">
                <span 
                  class="px-3 py-1 rounded-full text-sm font-bold shadow-lg"
                  :class="isDark ? 'bg-red-600/90 text-white' : 'bg-red-500 text-white'"
                >
                  {{ scholar.score }}分
                </span>
              </div>
            </div>

            <!-- 信息区 -->
            <div class="p-6 portrait:p-4">
              <h3 
                class="text-2xl portrait:text-xl font-bold mb-2"
                :class="isDark ? 'text-yellow-300' : 'text-red-800'"
              >
                {{ scholar.name }}
              </h3>
              <p 
                class="text-sm mb-3 font-medium"
                :class="isDark ? 'text-red-300' : 'text-red-600'"
              >
                {{ scholar.rankDescription }}
              </p>
              <div 
                v-if="scholar.university"
                class="flex items-center gap-2 text-sm"
                :class="isDark ? 'text-gray-300' : 'text-gray-700'"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span class="truncate">{{ scholar.university }}</span>
              </div>
              <div 
                v-if="scholar.score"
                class="mt-2 text-lg font-bold"
                :class="isDark ? 'text-yellow-400' : 'text-red-600'"
              >
                {{ scholar.score }} 分
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页指示器 -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 mt-8">
        <button
          @click="prevPage"
          class="p-3 rounded-full transition-all duration-300 hover:scale-110"
          :class="isDark ? 'bg-red-900/50 text-red-200 hover:bg-red-800/70' : 'bg-red-100 text-red-800 hover:bg-red-200'"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="flex gap-2">
          <button
            v-for="page in totalPages"
            :key="page"
            @click="goToPage(page - 1)"
            class="w-3 h-3 rounded-full transition-all duration-300"
            :class="currentPage === page - 1 
              ? (isDark ? 'bg-yellow-400 w-8' : 'bg-red-600 w-8')
              : (isDark ? 'bg-red-700/50' : 'bg-red-300')"
          ></button>
        </div>

        <button
          @click="nextPage"
          class="p-3 rounded-full transition-all duration-300 hover:scale-110"
          :class="isDark ? 'bg-red-900/50 text-red-200 hover:bg-red-800/70' : 'bg-red-100 text-red-800 hover:bg-red-200'"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </main>

    <!-- 详情弹窗 -->
    <Transition name="modal">
      <div
        v-if="selectedScholar"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        @click.self="closeDetail"
      >
        <div 
          class="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
          :class="isDark ? 'bg-gradient-to-br from-red-900 to-yellow-900' : 'bg-gradient-to-br from-red-50 to-yellow-50'"
        >
          <button
            @click="closeDetail"
            class="absolute top-4 right-4 z-10 p-2 rounded-full transition-all duration-300 hover:scale-110"
            :class="isDark ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-white/80 text-gray-800 hover:bg-white'"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div class="p-8">
            <div class="flex flex-col md:flex-row gap-6">
              <!-- 照片 -->
              <div class="md:w-1/3">
                <div class="aspect-[3/4] rounded-2xl overflow-hidden shadow-xl">
                  <img
                    v-if="selectedScholar.photoUrl"
                    :src="selectedScholar.photoUrl"
                    :alt="selectedScholar.name"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center"
                    :class="isDark ? 'bg-gradient-to-br from-red-800 to-yellow-800' : 'bg-gradient-to-br from-red-200 to-yellow-200'"
                  >
                    <span class="text-5xl font-bold text-center px-2 break-all" :class="isDark ? 'text-yellow-500/30' : 'text-red-800/30'">
                      {{ selectedScholar.name }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 详细信息 -->
              <div class="md:w-2/3">
                <div 
                  class="inline-block px-4 py-1 rounded-full text-sm font-bold mb-4"
                  :class="isDark ? 'bg-yellow-500 text-gray-900' : 'bg-yellow-400 text-gray-900'"
                >
                  {{ selectedScholar.examYear }} 年
                </div>
                
                <h2 
                  class="text-4xl font-bold mb-4"
                  :class="isDark ? 'text-yellow-300' : 'text-red-800'"
                >
                  {{ selectedScholar.name }}
                </h2>

                <div class="space-y-4">
                  <div>
                    <p 
                      class="text-sm font-semibold mb-1"
                      :class="isDark ? 'text-gray-400' : 'text-gray-600'"
                    >
                      成绩排名
                    </p>
                    <p 
                      class="text-lg font-medium"
                      :class="isDark ? 'text-red-300' : 'text-red-600'"
                    >
                      {{ selectedScholar.rankDescription }}
                    </p>
                  </div>

                  <div v-if="selectedScholar.score">
                    <p 
                      class="text-sm font-semibold mb-1"
                      :class="isDark ? 'text-gray-400' : 'text-gray-600'"
                    >
                      高考分数
                    </p>
                    <p 
                      class="text-2xl font-bold"
                      :class="isDark ? 'text-yellow-400' : 'text-red-600'"
                    >
                      {{ selectedScholar.score }} 分
                    </p>
                  </div>

                  <div v-if="selectedScholar.university">
                    <p 
                      class="text-sm font-semibold mb-1"
                      :class="isDark ? 'text-gray-400' : 'text-gray-600'"
                    >
                      录取院校
                    </p>
                    <p 
                      class="text-lg"
                      :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                    >
                      {{ selectedScholar.university }}
                    </p>
                  </div>

                  <div v-if="selectedScholar.major">
                    <p 
                      class="text-sm font-semibold mb-1"
                      :class="isDark ? 'text-gray-400' : 'text-gray-600'"
                    >
                      专业
                    </p>
                    <p 
                      class="text-lg"
                      :class="isDark ? 'text-gray-200' : 'text-gray-800'"
                    >
                      {{ selectedScholar.major }}
                    </p>
                  </div>

                  <div v-if="selectedScholar.biography">
                    <p 
                      class="text-sm font-semibold mb-1"
                      :class="isDark ? 'text-gray-400' : 'text-gray-600'"
                    >
                      简介
                    </p>
                    <p 
                      class="text-base leading-relaxed"
                      :class="isDark ? 'text-gray-300' : 'text-gray-700'"
                    >
                      {{ selectedScholar.biography }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 底部导航 -->
    <BottomNavigation />
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.3s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9);
}
</style>

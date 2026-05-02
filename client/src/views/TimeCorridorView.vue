<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { contentApi } from '@/api';
import FaceTagOverlay from '@/components/FaceTagOverlay.vue';
import BottomNavigation from '@/components/BottomNavigation.vue';

const router = useRouter();
const photos = ref<any[]>([]);
const selectedPhoto = ref<any>(null);
const selectedYear = ref<number | null>(null);
const years = ref<number[]>([]);

async function loadPhotos() {
  try {
    const res = await contentApi.getGraduationPhotos(
      selectedYear.value ? { year: selectedYear.value } : undefined
    );
    if (res.data.success) {
      photos.value = res.data.data;
      // 提取年份列表
      const yearSet = new Set<number>(res.data.data.map((p: any) => p.year));
      years.value = Array.from(yearSet).sort((a, b) => b - a);
    }
  } catch (e) {
    console.error('加载毕业照失败:', e);
  }
}

function selectPhoto(photo: any) {
  selectedPhoto.value = photo;
}

function closePhoto() {
  selectedPhoto.value = null;
}

function filterByYear(year: number | null) {
  selectedYear.value = year;
  loadPhotos();
}

function goBack() {
  router.push('/');
}

function scrollToPhotos() {
  // 滚动到毕业照区域
  const photosSection = document.querySelector('.photos-section');
  if (photosSection) {
    photosSection.scrollIntoView({ behavior: 'smooth' });
  }
}

onMounted(() => {
  loadPhotos();
});
</script>

<template>
  <div class="relative w-full min-h-screen overflow-hidden bg-[#020608] text-white font-sans selection:bg-teal-500/30 pb-20">
    <!-- 背景 -->
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div class="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none"></div>

    <div class="relative z-10 w-full p-6 lg:p-10 flex flex-col h-screen">
      <!-- 顶部导航 -->
      <header class="flex items-center justify-between mb-8 pb-4 border-b border-teal-500/20 shrink-0">
        <div class="flex items-center gap-6">
          <button @click="goBack" class="group flex items-center gap-3 text-white/60 hover:text-teal-400 transition-colors">
            <div class="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/10 group-hover:border-teal-400/50 transition-all">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span class="text-sm font-mono tracking-widest uppercase">返回首页</span>
          </button>
          <div>
            <h1 class="text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">时空长廊</h1>
            <p class="text-[10px] text-teal-200/40 font-mono tracking-[0.3em] uppercase">Time Corridor · Graduation Photos</p>
          </div>
        </div>
        <div class="hidden md:flex items-center gap-2 text-xs font-mono text-teal-500/50">
          <span class="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
          穿越时光，重温青春记忆
        </div>
      </header>

    <div class="flex-1 overflow-y-auto custom-scrollbar">

      <!-- 功能入口 - 竖屏单列，横屏三列 -->
      <div class="grid grid-cols-1 portrait:grid-cols-1 landscape:grid-cols-3 gap-4 mb-8">
        <div 
          @click="router.push('/vintage-museum')"
          class="sub-module-entry glass-card rounded-xl p-6 portrait:p-5 cursor-pointer hover:bg-white/10 hover:border-amber-400/30 hover:-translate-y-1 transition-all duration-300 group min-h-[80px] portrait:min-h-[72px]"
        >
          <div class="flex items-center gap-4">
            <span class="text-4xl portrait:text-3xl">🏛️</span>
            <div class="flex-1">
              <h3 class="text-lg portrait:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">老物件数字馆</h3>
              <p class="text-white/50 text-sm portrait:text-xs">录取通知书、毕业证、校徽等</p>
            </div>
            <svg class="w-5 h-5 text-white/30 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        <div 
          @click="router.push('/class-roster-wall')"
          class="sub-module-entry glass-card rounded-xl p-6 portrait:p-5 cursor-pointer hover:bg-white/10 hover:border-indigo-400/30 hover:-translate-y-1 transition-all duration-300 group min-h-[80px] portrait:min-h-[72px]"
        >
          <div class="flex items-center gap-4">
            <span class="text-4xl portrait:text-3xl">📋</span>
            <div class="flex-1">
              <h3 class="text-lg portrait:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-500">班级名录墙</h3>
              <p class="text-white/50 text-sm portrait:text-xs">按班级查看学生名单和毕业照</p>
            </div>
            <svg class="w-5 h-5 text-white/30 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
        
        <div 
          @click="scrollToPhotos"
          class="sub-module-entry glass-card rounded-xl p-6 portrait:p-5 cursor-pointer hover:bg-white/10 hover:border-teal-400/30 hover:-translate-y-1 transition-all duration-300 group min-h-[80px] portrait:min-h-[72px] border-teal-400/30 bg-teal-500/10"
        >
          <div class="flex items-center gap-4">
            <span class="text-4xl portrait:text-3xl">📷</span>
            <div class="flex-1">
              <h3 class="text-lg portrait:text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">毕业照合集</h3>
              <p class="text-white/50 text-sm portrait:text-xs">按年份、班级归档的毕业照</p>
            </div>
            <div class="flex items-center gap-1 text-teal-400 text-xs">
              <span>当前</span>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 年份筛选 -->
      <div class="photos-section flex flex-wrap gap-2 justify-center mb-8">
        <button
          @click="filterByYear(null)"
          :class="[
            'px-4 py-2 rounded-full transition-colors border',
            selectedYear === null 
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30'
          ]"
        >
          全部年份
        </button>
        <button
          v-for="year in years"
          :key="year"
          @click="filterByYear(year)"
          :class="[
            'px-4 py-2 rounded-full transition-colors border',
            selectedYear === year 
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30'
          ]"
        >
          {{ year }}届
        </button>
      </div>

      <!-- 照片网格 - 竖屏1-2列，横屏3列 -->
      <div class="grid grid-cols-1 portrait:grid-cols-1 portrait:sm:grid-cols-2 landscape:grid-cols-2 landscape:lg:grid-cols-3 gap-6 portrait:gap-4">
        <div
          v-for="photo in photos"
          :key="photo.id"
          @click="selectPhoto(photo)"
          class="glass-card rounded-xl overflow-hidden cursor-pointer hover:bg-white/10 hover:border-teal-400/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(20,184,166,0.15)] transition-all duration-300"
        >
          <div class="aspect-video portrait:aspect-[4/3] bg-black/40 flex items-center justify-center">
            <img 
              v-if="photo.restored_url || photo.original_url"
              :src="photo.restored_url || photo.original_url" 
              :alt="`${photo.year}届 ${photo.class_name}`"
              class="w-full h-full object-cover"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
            />
            <span v-else class="text-gray-500">📷 暂无图片</span>
          </div>
          <div class="p-4 portrait:p-3">
            <h3 class="text-white font-semibold portrait:text-base">{{ photo.year }}届</h3>
            <p class="text-teal-400/60 text-sm portrait:text-xs">{{ photo.class_name || '全体合影' }}</p>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!photos.length" class="text-center py-12 text-white/30">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>暂无毕业照数据</p>
      </div>
    </div>

    </div>

    <!-- 照片详情弹窗 - 竖屏全屏模式 -->
    <transition name="fade">
      <div 
        v-if="selectedPhoto" 
        class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 portrait:p-0"
        @click.self="closePhoto"
      >
        <div class="max-w-4xl w-full glass-card rounded-2xl portrait:rounded-none portrait:max-w-none portrait:h-full overflow-hidden portrait:overflow-y-auto portrait:flex portrait:flex-col">
          <div class="relative aspect-video portrait:aspect-auto portrait:min-h-[40vh] portrait:flex-shrink-0 bg-black/40 flex items-center justify-center">
            <img 
              v-if="selectedPhoto.restored_url || selectedPhoto.original_url"
              :src="selectedPhoto.restored_url || selectedPhoto.original_url" 
              :alt="`${selectedPhoto.year}届 ${selectedPhoto.class_name}`"
              class="w-full h-full object-contain"
              @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
            />
            <span v-else class="text-gray-500 text-xl">📷 暂无图片</span>
            
            <!-- 人脸标记覆盖层 -->
            <FaceTagOverlay 
              v-if="selectedPhoto.face_tags?.length"
              :tags="selectedPhoto.face_tags"
            />
            
            <!-- 竖屏模式下的关闭按钮 -->
            <button 
              @click="closePhoto"
              class="hidden portrait:flex absolute top-4 right-4 w-12 h-12 rounded-full bg-black/50 border border-white/20 items-center justify-center text-white/80 hover:text-teal-400 hover:border-teal-400/50 transition-all z-10"
            >
              ✕
            </button>
          </div>
          <div class="p-6 portrait:p-4 portrait:flex-1">
            <div class="flex justify-between items-start">
              <div>
                <h2 class="text-2xl portrait:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">{{ selectedPhoto.year }}届</h2>
                <p class="text-teal-400/60 portrait:text-sm">{{ selectedPhoto.class_name || '全体合影' }}</p>
                <p v-if="selectedPhoto.face_tags?.length" class="text-white/40 text-sm portrait:text-xs mt-1">
                  已标记 {{ selectedPhoto.face_tags.length }} 人
                </p>
              </div>
              <button 
                @click="closePhoto"
                class="w-10 h-10 portrait:hidden rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-teal-400 hover:border-teal-400/50 transition-all"
              >
                ✕
              </button>
            </div>
            
            <!-- 人脸标记提示 -->
            <p v-if="selectedPhoto.face_tags?.length" class="mt-4 text-teal-500/50 text-sm portrait:text-xs">
              💡 提示：点击照片上的标记区域可查看人物姓名
            </p>
            <p v-else class="mt-4 text-white/30 text-sm portrait:text-xs">
              📷 该照片暂无人脸标记信息
            </p>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- 底部导航栏 -->
    <BottomNavigation />
  </div>
</template>

<style scoped>
.glass-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAlumniStore } from '@/stores/alumni';
import { useThemeStore } from '@/stores/theme';
import { useNavigationStore } from '@/stores/navigation';
import ThemeToggle from '@/components/ThemeToggle.vue';

const route = useRoute();
const router = useRouter();
const alumniStore = useAlumniStore();
const themeStore = useThemeStore();
const navigationStore = useNavigationStore();

const alumniId = computed(() => route.params.id as string);
const isDark = computed(() => themeStore.isDark);

// 图片放大相关状态
const isImageZoomed = ref(false);
const zoomedImageUrl = ref('');

// 打开放大的图片
function openImageZoom(url: string) {
  zoomedImageUrl.value = url;
  isImageZoomed.value = true;
  // 禁止背景滚动
  document.body.style.overflow = 'hidden';
}

// 关闭放大的图片
function closeImageZoom() {
  isImageZoomed.value = false;
  zoomedImageUrl.value = '';
  // 恢复背景滚动
  document.body.style.overflow = '';
}

onMounted(async () => {
  await alumniStore.getDetail(alumniId.value);
  await alumniStore.getRecommendations(alumniId.value);
});

function goBack() {
  // 优先返回来源模块，否则用浏览器后退
  if (navigationStore.returnToPath) {
    navigationStore.returnFromDetail(router);
  } else {
    router.back();
  }
}

function viewAlumni(id: string) {
  router.push(`/alumni/${id}`);
}

// 获取照片URL
function getPhotoUrl(alumni: any) {
  // 尝试多个可能的照片字段位置
  const photoUrl = alumni.photoUrl || alumni.photo || alumni.extraInfo?.photo;
  if (!photoUrl) return null;
  return photoUrl;
}

// 获取传记信息
function getBiography(alumni: any) {
  return alumni.biography || alumni.extraInfo?.biography || null;
}
</script>

<template>
  <div 
    class="relative w-full min-h-screen overflow-hidden font-sans selection:bg-teal-500/30 transition-colors duration-500"
    :class="isDark ? 'bg-[#020608] text-white' : 'bg-[#faf8f5] text-[#2d1810]'"
  >
    <!-- 背景 -->
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div 
      class="absolute inset-0 z-0 pointer-events-none transition-all duration-500"
      :class="isDark ? 'bg-gradient-to-b from-transparent via-transparent to-black/80' : 'bg-gradient-to-b from-transparent via-transparent to-[#f5f0ea]/80'"
    ></div>

    <div class="relative z-10 w-full p-6 lg:p-10 flex flex-col h-screen">
      <!-- 顶部导航 -->
      <header 
        class="flex items-center justify-between mb-8 pb-4 border-b shrink-0 transition-colors duration-500"
        :class="isDark ? 'border-teal-500/20' : 'border-[#8b2500]/20'"
      >
        <div class="flex items-center gap-6">
          <button 
            @click="goBack" 
            class="group flex items-center gap-3 transition-colors"
            :class="isDark ? 'text-white/60 hover:text-teal-400' : 'text-[#2d1810]/60 hover:text-[#8b2500]'"
          >
            <div 
              class="w-10 h-10 rounded-full border flex items-center justify-center transition-all"
              :class="isDark 
                ? 'border-white/20 group-hover:bg-white/10 group-hover:border-teal-400/50' 
                : 'border-[#8b2500]/20 group-hover:bg-[#8b2500]/10 group-hover:border-[#8b2500]/50'"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span class="text-sm font-mono tracking-widest uppercase">返回</span>
          </button>
          <div>
            <h1 
              class="text-3xl font-bold tracking-wide text-transparent bg-clip-text transition-all duration-500"
              :class="isDark 
                ? 'bg-gradient-to-r from-teal-300 to-cyan-500' 
                : 'bg-gradient-to-r from-[#8b2500] to-[#a63c1c]'"
            >校友档案</h1>
            <p 
              class="text-xs font-mono tracking-[0.3em] uppercase transition-colors duration-500"
              :class="isDark ? 'text-teal-200/40' : 'text-[#8b2500]/40'"
            >Alumni Profile Detail</p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div 
            class="hidden md:flex items-center gap-2 text-xs font-mono transition-colors duration-500"
            :class="isDark ? 'text-teal-500/50' : 'text-[#8b2500]/50'"
          >
            <span 
              class="w-2 h-2 rounded-full animate-pulse transition-colors duration-500"
              :class="isDark ? 'bg-teal-500 shadow-[0_0_10px_#14b8a6]' : 'bg-[#8b2500] shadow-[0_0_10px_#8b2500]'"
            ></span>
            PROFILE LOADED
          </div>
          <ThemeToggle />
        </div>
      </header>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
    <div class="max-w-5xl mx-auto">
      <!-- 加载状态 -->
      <div 
        v-if="alumniStore.loading" 
        class="text-center py-12 transition-colors duration-500"
        :class="isDark ? 'text-white/30' : 'text-[#2d1810]/30'"
      >
        <div 
          class="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4 transition-colors duration-500"
          :class="isDark ? 'border-teal-500/30 border-t-teal-500' : 'border-[#8b2500]/30 border-t-[#8b2500]'"
        ></div>
        加载中...
      </div>

      <!-- 校友详情 -->
      <div v-else-if="alumniStore.currentAlumni" class="space-y-6">
        <!-- 基本信息卡片 -->
        <div 
          class="glass-card rounded-2xl p-8 portrait:p-5 transition-all duration-500"
          :class="isDark 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white/70 border-[#8b2500]/10'"
        >
          <div class="flex portrait:flex-col items-start portrait:items-center gap-8 portrait:gap-6">
            <!-- 头像/照片 -->
            <div class="flex-shrink-0">
              <div 
                v-if="getPhotoUrl(alumniStore.currentAlumni)" 
                class="w-40 h-40 portrait:w-32 portrait:h-32 rounded-2xl overflow-hidden shadow-2xl ring-4 transition-all duration-500 cursor-pointer hover:scale-105"
                :class="isDark ? 'ring-teal-500/20 hover:ring-teal-500/40' : 'ring-[#8b2500]/20 hover:ring-[#8b2500]/40'"
                @click="openImageZoom(getPhotoUrl(alumniStore.currentAlumni)!)"
              >
                <img 
                  :src="getPhotoUrl(alumniStore.currentAlumni) || undefined" 
                  :alt="alumniStore.currentAlumni.name"
                  class="w-full h-full object-cover"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                />
              </div>
              <div 
                v-else
                class="w-40 h-40 portrait:w-32 portrait:h-32 rounded-2xl flex items-center justify-center text-6xl portrait:text-5xl font-bold shadow-2xl ring-4 transition-all duration-500"
                :class="isDark 
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white ring-teal-500/20' 
                  : 'bg-gradient-to-br from-[#8b2500] to-[#a63c1c] text-white ring-[#8b2500]/20'"
              >
                {{ alumniStore.currentAlumni.name[0] }}
              </div>
            </div>
            
            <!-- 基本信息 -->
            <div class="flex-1 portrait:text-center portrait:w-full">
              <h1 
                class="text-4xl portrait:text-3xl font-bold mb-3 transition-colors duration-500"
                :class="isDark ? 'text-white' : 'text-[#2d1810]'"
              >
                {{ alumniStore.currentAlumni.name }}
              </h1>
              <div class="flex flex-wrap portrait:justify-center gap-2 mb-6">
                <span 
                  class="px-4 py-1.5 portrait:px-3 rounded-full text-sm portrait:text-xs font-medium transition-all duration-500"
                  :class="isDark 
                    ? 'bg-teal-500/10 border border-teal-500/20 text-teal-300' 
                    : 'bg-[#8b2500]/10 border border-[#8b2500]/20 text-[#8b2500]'"
                >
                  {{ alumniStore.currentAlumni.graduationYear }}届
                </span>
                <span 
                  v-if="alumniStore.currentAlumni.className"
                  class="px-4 py-1.5 portrait:px-3 rounded-full text-sm portrait:text-xs font-medium transition-all duration-500"
                  :class="isDark 
                    ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300' 
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-700'"
                >
                  {{ alumniStore.currentAlumni.className }}
                </span>
                <span 
                  v-if="alumniStore.currentAlumni.industry" 
                  class="px-4 py-1.5 portrait:px-3 rounded-full text-sm portrait:text-xs font-medium transition-all duration-500"
                  :class="isDark 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                    : 'bg-green-500/10 border border-green-500/20 text-green-700'"
                >
                  {{ alumniStore.currentAlumni.industry }}
                </span>
              </div>

              <!-- 传记/简介 -->
              <div 
                v-if="getBiography(alumniStore.currentAlumni)" 
                class="p-4 rounded-lg transition-all duration-500"
                :class="isDark ? 'bg-black/20' : 'bg-white/50'"
              >
                <p 
                  class="text-base leading-relaxed transition-colors duration-500"
                  :class="isDark ? 'text-white/80' : 'text-[#2d1810]/80'"
                >
                  {{ getBiography(alumniStore.currentAlumni) }}
                </p>
              </div>
            </div>
          </div>

          <!-- 成就/荣誉 -->
          <div 
            v-if="(alumniStore.currentAlumni as any).extraInfo?.achievement || (alumniStore.currentAlumni as any).achievement"
            class="mt-6 p-4 rounded-lg transition-all duration-500"
            :class="isDark ? 'bg-teal-500/10 border border-teal-500/20' : 'bg-[#8b2500]/10 border border-[#8b2500]/20'"
          >
            <div class="flex items-start gap-3">
              <span class="text-2xl">🏆</span>
              <div class="flex-1">
                <p 
                  class="text-xs mb-2 font-semibold transition-colors duration-500"
                  :class="isDark ? 'text-teal-300' : 'text-[#8b2500]'"
                >主要成就</p>
                <p 
                  class="text-base leading-relaxed transition-colors duration-500"
                  :class="isDark ? 'text-white/90' : 'text-[#2d1810]/90'"
                >
                  {{ (alumniStore.currentAlumni as any).extraInfo?.achievement || (alumniStore.currentAlumni as any).achievement }}
                </p>
              </div>
            </div>
          </div>

          <!-- 详细信息网格 -->
          <div class="mt-8 portrait:mt-6 grid grid-cols-1 portrait:grid-cols-1 landscape:md:grid-cols-2 gap-4 portrait:gap-3">
            <div 
              v-if="alumniStore.currentAlumni.currentCity" 
              class="flex items-center gap-3 p-4 portrait:p-3 rounded-lg transition-all duration-500"
              :class="isDark ? 'bg-black/20' : 'bg-white/50'"
            >
              <span class="text-2xl">📍</span>
              <div class="flex-1">
                <p 
                  class="text-xs mb-1 transition-colors duration-500"
                  :class="isDark ? 'text-teal-400/60' : 'text-[#8b2500]/60'"
                >所在城市</p>
                <p 
                  class="font-medium transition-colors duration-500"
                  :class="isDark ? 'text-white' : 'text-[#2d1810]'"
                >{{ alumniStore.currentAlumni.currentCity }}</p>
              </div>
            </div>
            <div 
              v-if="alumniStore.currentAlumni.workUnit" 
              class="flex items-center gap-3 p-4 portrait:p-3 rounded-lg transition-all duration-500"
              :class="isDark ? 'bg-black/20' : 'bg-white/50'"
            >
              <span class="text-2xl">🏢</span>
              <div class="flex-1">
                <p 
                  class="text-xs mb-1 transition-colors duration-500"
                  :class="isDark ? 'text-teal-400/60' : 'text-[#8b2500]/60'"
                >工作单位</p>
                <p 
                  class="font-medium transition-colors duration-500"
                  :class="isDark ? 'text-white' : 'text-[#2d1810]'"
                >{{ alumniStore.currentAlumni.workUnit }}</p>
              </div>
            </div>
            <div 
              v-if="alumniStore.currentAlumni.phone" 
              class="flex items-center gap-3 p-4 portrait:p-3 rounded-lg transition-all duration-500"
              :class="isDark ? 'bg-black/20' : 'bg-white/50'"
            >
              <span class="text-2xl">📱</span>
              <div class="flex-1">
                <p 
                  class="text-xs mb-1 transition-colors duration-500"
                  :class="isDark ? 'text-teal-400/60' : 'text-[#8b2500]/60'"
                >联系电话</p>
                <p 
                  class="font-medium transition-colors duration-500"
                  :class="isDark ? 'text-white' : 'text-[#2d1810]'"
                >{{ alumniStore.currentAlumni.phone }}</p>
              </div>
            </div>
            <div 
              v-if="alumniStore.currentAlumni.email" 
              class="flex items-center gap-3 p-4 portrait:p-3 rounded-lg transition-all duration-500"
              :class="isDark ? 'bg-black/20' : 'bg-white/50'"
            >
              <span class="text-2xl">📧</span>
              <div class="flex-1">
                <p 
                  class="text-xs mb-1 transition-colors duration-500"
                  :class="isDark ? 'text-teal-400/60' : 'text-[#8b2500]/60'"
                >电子邮箱</p>
                <p 
                  class="font-medium transition-colors duration-500"
                  :class="isDark ? 'text-white' : 'text-[#2d1810]'"
                >{{ alumniStore.currentAlumni.email }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 推荐校友 -->
        <div 
          v-if="alumniStore.recommendations.length" 
          class="glass-card rounded-2xl p-6 portrait:p-4 transition-all duration-500"
          :class="isDark 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white/70 border-[#8b2500]/10'"
        >
          <h2 
            class="text-xl portrait:text-lg font-semibold mb-4 portrait:mb-3 transition-colors duration-500"
            :class="isDark ? 'text-white' : 'text-[#2d1810]'"
          >相关校友推荐</h2>
          <div class="grid grid-cols-2 portrait:grid-cols-2 landscape:md:grid-cols-3 gap-4 portrait:gap-3">
            <div
              v-for="rec in alumniStore.recommendations"
              :key="rec.id"
              @click="viewAlumni(rec.id)"
              class="border rounded-lg p-4 portrait:p-3 cursor-pointer transition-all duration-300"
              :class="isDark 
                ? 'bg-black/40 border-white/5 hover:bg-white/5 hover:border-teal-400/20' 
                : 'bg-white/50 border-[#8b2500]/10 hover:bg-white/80 hover:border-[#8b2500]/30'"
            >
              <div class="flex items-center gap-3 portrait:gap-2">
                <div 
                  class="w-10 h-10 portrait:w-8 portrait:h-8 rounded-full flex items-center justify-center text-white font-bold portrait:text-sm shadow-lg transition-all duration-500"
                  :class="isDark 
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-500/20' 
                    : 'bg-gradient-to-br from-[#8b2500] to-[#a63c1c] shadow-[#8b2500]/20'"
                >
                  {{ rec.name[0] }}
                </div>
                <div class="min-w-0">
                  <p 
                    class="font-semibold portrait:text-sm truncate transition-colors duration-500"
                    :class="isDark ? 'text-white' : 'text-[#2d1810]'"
                  >{{ rec.name }}</p>
                  <p 
                    class="text-sm portrait:text-xs transition-colors duration-500"
                    :class="isDark ? 'text-teal-400/60' : 'text-[#8b2500]/60'"
                  >{{ rec.graduationYear }}届</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 未找到 -->
      <div 
        v-else 
        class="text-center py-12 transition-colors duration-500"
        :class="isDark ? 'text-white/30' : 'text-[#2d1810]/30'"
      >
        <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p>未找到该校友信息</p>
      </div>
    </div>
    </div>
    </div>

    <!-- 图片放大模态框 -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isImageZoomed"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click="closeImageZoom"
      >
        <!-- 背景遮罩 -->
        <div 
          class="absolute inset-0 bg-black/90 backdrop-blur-sm"
          :class="isDark ? 'bg-black/95' : 'bg-black/85'"
        ></div>

        <!-- 放大的图片 -->
        <div class="relative z-10 max-w-5xl max-h-[90vh] w-full flex items-center justify-center">
          <img
            :src="zoomedImageUrl"
            alt="放大图片"
            class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            @click.stop
          />

          <!-- 关闭按钮 -->
          <button
            @click="closeImageZoom"
            class="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
            :class="isDark 
              ? 'bg-white/10 hover:bg-white/20 text-white' 
              : 'bg-white/20 hover:bg-white/30 text-white'"
          >
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- 提示文字 -->
          <p
            class="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/60 font-mono"
          >
            点击背景或关闭按钮退出
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.glass-card {
  @apply backdrop-blur-xl border shadow-2xl;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
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

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useThemeStore } from '@/stores/theme';

interface TimelineItem {
  year: number;
  photos: any[];
  events?: string[];
}

const props = defineProps<{
  items: TimelineItem[];
}>();

const emit = defineEmits<{
  (e: 'selectPhoto', photo: any): void;
}>();

const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);

const scrollContainer = ref<HTMLDivElement>();
const isDragging = ref(false);
const startX = ref(0);
const scrollLeft = ref(0);

// 年代路标颜色
const eraColors: Record<string, string> = {
  '1920': '#6b7280', // 灰
  '1940': '#b45309', // 棕
  '1960': '#dc2626', // 红
  '1980': '#2563eb', // 蓝
  '2000': '#059669', // 绿
  '2020': '#7c3aed', // 紫
};

function getEraColor(year: number): string {
  const eras = Object.keys(eraColors).map(Number).sort();
  for (let i = eras.length - 1; i >= 0; i--) {
    if (year >= eras[i]) return eraColors[eras[i]];
  }
  return eraColors['1920'];
}

function getEraLabel(year: number): string {
  if (year < 1940) return '建校初期';
  if (year < 1960) return '战火纷飞';
  if (year < 1980) return '重建时期';
  if (year < 2000) return '改革开放';
  if (year < 2010) return '新世纪';
  return '新时代';
}

// 拖拽滚动
function onMouseDown(e: MouseEvent) {
  isDragging.value = true;
  startX.value = e.pageX - (scrollContainer.value?.offsetLeft || 0);
  scrollLeft.value = scrollContainer.value?.scrollLeft || 0;
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return;
  e.preventDefault();
  const x = e.pageX - (scrollContainer.value?.offsetLeft || 0);
  const walk = (x - startX.value) * 1.5;
  if (scrollContainer.value) scrollContainer.value.scrollLeft = scrollLeft.value - walk;
}

function onMouseUp() {
  isDragging.value = false;
}

// 触摸拖拽
function onTouchStart(e: TouchEvent) {
  isDragging.value = true;
  startX.value = e.touches[0].pageX - (scrollContainer.value?.offsetLeft || 0);
  scrollLeft.value = scrollContainer.value?.scrollLeft || 0;
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value) return;
  const x = e.touches[0].pageX - (scrollContainer.value?.offsetLeft || 0);
  const walk = (x - startX.value) * 1.5;
  if (scrollContainer.value) scrollContainer.value.scrollLeft = scrollLeft.value - walk;
}

function onTouchEnd() {
  isDragging.value = false;
}
</script>

<template>
  <div class="relative w-full h-full overflow-hidden"
    :class="isDark ? 'bg-[#020608]' : 'bg-[#faf8f5]'"
    :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
  >
    <!-- 背景时间线 -->
    <div class="absolute inset-y-0 left-0 right-0 pointer-events-none">
      <div class="h-full flex items-center px-8">
        <div v-for="(_item, idx) in items" :key="'bg-' + idx"
          class="absolute w-px h-2/3"
          :class="isDark ? 'bg-white/5' : 'bg-black/5'"
          :style="{ left: `${(idx / items.length) * 100}%` }"
        />
      </div>
    </div>

    <!-- 横向滚动时间轴 -->
    <div
      ref="scrollContainer"
      class="h-full overflow-x-auto overflow-y-hidden scrollbar-hide"
      style="scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div class="flex items-center h-full gap-0 px-16" style="min-width: max-content;">
        <!-- 起点标记 -->
        <div class="flex flex-col items-center shrink-0 w-32">
          <div class="text-4xl mb-2">🏫</div>
          <div class="text-sm font-bold" :class="isDark ? 'text-white/80' : 'text-gray-700'">校史起点</div>
        </div>

        <!-- 年代节点 -->
        <template v-for="(item, _idx) in items" :key="item.year">
          <!-- 连接线 -->
          <div class="h-0.5 w-32 shrink-0" :style="{ background: getEraColor(item.year) + '40' }"></div>

          <!-- 年代路标 -->
          <div class="shrink-0 w-72 flex flex-col items-center" style="scroll-snap-align: center;">
            <!-- 年份标记 -->
            <div class="relative mb-4">
              <div class="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold border-2"
                :style="{ borderColor: getEraColor(item.year), color: getEraColor(item.year) }"
                :class="isDark ? 'bg-white/5' : 'bg-white'">
                {{ item.year }}
              </div>
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-60">
                {{ getEraLabel(item.year) }}
              </div>
            </div>

            <!-- 照片网格 -->
            <div class="mt-8 grid grid-cols-2 gap-2 w-full">
              <div v-for="photo in item.photos.slice(0, 4)" :key="photo.id"
                class="aspect-square rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105"
                @click="emit('selectPhoto', photo)"
              >
                <img v-if="photo.original_url || photo.restored_url"
                  :src="photo.restored_url || photo.original_url"
                  :alt="photo.class_name || `${item.year}届`"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-xs opacity-30"
                  :class="isDark ? 'bg-white/5' : 'bg-black/5'">
                  {{ photo.class_name || `${item.year}届` }}
                </div>
              </div>
            </div>

            <!-- 事件标签 -->
            <div v-if="item.events?.length" class="mt-3 text-xs text-center opacity-60">
              {{ item.events.join(' · ') }}
            </div>

            <!-- 照片数量 -->
            <div class="mt-2 text-xs opacity-40">
              {{ item.photos.length }} 张照片
            </div>
          </div>
        </template>

        <!-- 终点 -->
        <div class="h-0.5 w-32 shrink-0" :style="{ background: getEraColor(2025) + '40' }"></div>
        <div class="flex flex-col items-center shrink-0 w-32">
          <div class="text-4xl mb-2">🌟</div>
          <div class="text-sm font-bold" :class="isDark ? 'text-white/80' : 'text-gray-700'">延续至今</div>
        </div>
      </div>
    </div>

    <!-- 滚动提示 -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-3 py-1.5 rounded-full animate-pulse"
      :class="isDark ? 'bg-white/10 text-white/40' : 'bg-black/5 text-black/30'">
      ← 左右滑动浏览时间轴 →
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>

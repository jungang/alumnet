<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { contentApi } from '@/api';

const router = useRouter();
const items = ref<any[]>([]);
const selectedItem = ref<any>(null);
const selectedType = ref<string | null>(null);
const currentImageIndex = ref(0);
const loading = ref(false);

const typeLabels: Record<string, string> = {
  admission_notice: '录取通知书',
  diploma: '毕业证',
  badge: '校徽',
  meal_ticket: '饭票',
  textbook: '课本',
  photo: '老照片',
  certificate: '证书',
  other: '其他',
};

const typeIcons: Record<string, string> = {
  admission_notice: '📜',
  diploma: '🎓',
  badge: '🏅',
  meal_ticket: '🎫',
  textbook: '📖',
  photo: '📷',
  certificate: '📃',
  other: '📦',
};

const types = computed(() => {
  const typeSet = new Set(items.value.map((item: any) => item.item_type || item.itemType));
  return Array.from(typeSet);
});

const filteredItems = computed(() => {
  if (!selectedType.value) return items.value;
  return items.value.filter((item: any) => 
    (item.item_type || item.itemType) === selectedType.value
  );
});

async function loadItems() {
  loading.value = true;
  try {
    const res = await contentApi.getVintageItems({ pageSize: 100 });
    if (res.data.success) {
      items.value = res.data.data.items || res.data.data;
    }
  } catch (e) {
    console.error('加载老物件失败:', e);
  } finally {
    loading.value = false;
  }
}

function selectItem(item: any) {
  selectedItem.value = item;
  currentImageIndex.value = 0;
}

function closeItem() {
  selectedItem.value = null;
}

function filterByType(type: string | null) {
  selectedType.value = type;
}

function prevImage() {
  if (selectedItem.value?.images?.length > 1) {
    currentImageIndex.value = (currentImageIndex.value - 1 + selectedItem.value.images.length) % selectedItem.value.images.length;
  }
}

function nextImage() {
  if (selectedItem.value?.images?.length > 1) {
    currentImageIndex.value = (currentImageIndex.value + 1) % selectedItem.value.images.length;
  }
}

function goBack() {
  router.push('/time-corridor');
}

onMounted(() => {
  loadItems();
});
</script>

<template>
  <div class="relative w-full min-h-screen overflow-hidden bg-[#020608] text-white font-sans selection:bg-amber-500/30">
    <!-- 背景 -->
    <div class="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
    <div class="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none"></div>

    <div class="relative z-10 w-full p-6 lg:p-10 flex flex-col h-screen">
      <!-- 顶部导航 -->
      <header class="flex items-center justify-between mb-8 pb-4 border-b border-amber-500/20 shrink-0">
        <div class="flex items-center gap-6">
          <button @click="goBack" class="group flex items-center gap-3 text-white/60 hover:text-amber-400 transition-colors">
            <div class="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white/10 group-hover:border-amber-400/50 transition-all">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </div>
            <span class="text-sm font-mono tracking-widest uppercase">返回</span>
          </button>
          <div>
            <h1 class="text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">老物件数字馆</h1>
            <p class="text-[10px] text-amber-200/40 font-mono tracking-[0.3em] uppercase">Vintage Museum · Digital Archive</p>
          </div>
        </div>
        <div class="hidden md:flex items-center gap-2 text-xs font-mono text-amber-500/50">
          <span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          珍藏岁月，留住记忆
        </div>
      </header>

      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <!-- 类型筛选 - 竖屏可换行 -->
        <div class="flex flex-wrap gap-2 portrait:gap-1.5 justify-center mb-8 portrait:mb-6">
          <button
            @click="filterByType(null)"
            :class="[
              'px-4 py-2 portrait:px-3 portrait:py-2.5 portrait:min-h-[44px] rounded-full transition-colors border text-sm portrait:text-xs',
              selectedType === null 
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-amber-400/30'
            ]"
          >
            全部
          </button>
          <button
            v-for="type in types"
            :key="type"
            @click="filterByType(type)"
            :class="[
              'px-4 py-2 portrait:px-3 portrait:py-2.5 portrait:min-h-[44px] rounded-full transition-colors border flex items-center gap-2 portrait:gap-1 text-sm portrait:text-xs',
              selectedType === type 
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-amber-400/30'
            ]"
          >
            <span>{{ typeIcons[type] }}</span>
            <span>{{ typeLabels[type] || type }}</span>
          </button>
        </div>

        <!-- 物件网格 - 竖屏2列 -->
        <div class="grid grid-cols-1 portrait:grid-cols-2 landscape:grid-cols-2 landscape:lg:grid-cols-3 landscape:xl:grid-cols-4 gap-6 portrait:gap-3">
          <div
            v-for="item in filteredItems"
            :key="item.id"
            @click="selectItem(item)"
            class="glass-card rounded-xl overflow-hidden cursor-pointer hover:bg-white/10 hover:border-amber-400/30 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300"
          >
            <div class="aspect-square portrait:aspect-[4/3] bg-black/40 flex items-center justify-center">
              <img 
                v-if="item.images?.length"
                :src="item.images[0]" 
                :alt="item.name"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-6xl portrait:text-4xl">{{ typeIcons[item.item_type || item.itemType] || '📦' }}</span>
            </div>
            <div class="p-4 portrait:p-3">
              <div class="flex items-center gap-2 portrait:gap-1 mb-1">
                <span class="text-lg portrait:text-base">{{ typeIcons[item.item_type || item.itemType] || '📦' }}</span>
                <span class="text-xs portrait:text-[10px] text-amber-400/60">{{ typeLabels[item.item_type || item.itemType] || '其他' }}</span>
              </div>
              <h3 class="text-white font-semibold truncate portrait:text-sm">{{ item.name }}</h3>
              <p v-if="item.era" class="text-amber-400/60 text-sm portrait:text-xs">{{ item.era }}</p>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && !filteredItems.length" class="text-center py-12 text-white/30">
          <span class="text-6xl mb-4 block">🏛️</span>
          <p>暂无老物件数据</p>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="text-center py-12 text-white/30">
          <span class="text-4xl animate-spin inline-block">⏳</span>
          <p class="mt-4">加载中...</p>
        </div>
      </div>
    </div>

    <!-- 物件详情弹窗 - 竖屏全屏 -->
    <transition name="fade">
      <div 
        v-if="selectedItem" 
        class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 portrait:p-0"
        @click.self="closeItem"
      >
        <div class="max-w-4xl w-full glass-card rounded-2xl portrait:rounded-none portrait:max-w-none portrait:h-full overflow-hidden portrait:overflow-y-auto portrait:flex portrait:flex-col">
          <!-- 图片区域 -->
          <div class="relative aspect-video portrait:aspect-auto portrait:min-h-[40vh] portrait:flex-shrink-0 bg-black/40 flex items-center justify-center">
            <img 
              v-if="selectedItem.images?.length"
              :src="selectedItem.images[currentImageIndex]" 
              :alt="selectedItem.name"
              class="w-full h-full object-contain"
            />
            <span v-else class="text-8xl portrait:text-6xl">{{ typeIcons[selectedItem.item_type || selectedItem.itemType] || '📦' }}</span>
            
            <!-- 竖屏模式下的关闭按钮 -->
            <button 
              @click="closeItem"
              class="hidden portrait:flex absolute top-4 right-4 w-12 h-12 rounded-full bg-black/50 border border-white/20 items-center justify-center text-white/80 hover:text-amber-400 hover:border-amber-400/50 transition-all z-10"
            >
              ✕
            </button>
            
            <!-- 图片导航 -->
            <template v-if="selectedItem.images?.length > 1">
              <button 
                @click.stop="prevImage"
                class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 portrait:w-12 portrait:h-12 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                ‹
              </button>
              <button 
                @click.stop="nextImage"
                class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 portrait:w-12 portrait:h-12 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                ›
              </button>
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <span 
                  v-for="(_, index) in selectedItem.images" 
                  :key="index"
                  :class="[
                    'w-2 h-2 portrait:w-3 portrait:h-3 rounded-full transition-colors',
                    index === currentImageIndex ? 'bg-amber-400' : 'bg-white/30'
                  ]"
                ></span>
              </div>
            </template>
          </div>
          
          <div class="p-6 portrait:p-4 portrait:flex-1">
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center gap-3 portrait:gap-2 mb-2">
                  <span class="text-2xl portrait:text-xl">{{ typeIcons[selectedItem.item_type || selectedItem.itemType] || '📦' }}</span>
                  <span class="px-3 py-1 portrait:px-2 rounded-full bg-amber-500/20 text-amber-300 text-sm portrait:text-xs">
                    {{ typeLabels[selectedItem.item_type || selectedItem.itemType] || '其他' }}
                  </span>
                </div>
                <h2 class="text-2xl portrait:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">{{ selectedItem.name }}</h2>
                <p v-if="selectedItem.era" class="text-amber-400/60 mt-1 portrait:text-sm">{{ selectedItem.era }}</p>
              </div>
              <button 
                @click="closeItem"
                class="w-10 h-10 portrait:hidden rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-amber-400 hover:border-amber-400/50 transition-all"
              >
                ✕
              </button>
            </div>
            
            <p v-if="selectedItem.description" class="mt-4 text-white/70 leading-relaxed portrait:text-sm">
              {{ selectedItem.description }}
            </p>
            
            <div v-if="selectedItem.donor_name || selectedItem.donorName" class="mt-4 pt-4 border-t border-white/10">
              <p class="text-amber-500/50 text-sm portrait:text-xs">
                捐赠者：{{ selectedItem.donor_name || selectedItem.donorName }}
                <span v-if="selectedItem.donor_class || selectedItem.donorClass">
                  （{{ selectedItem.donor_class || selectedItem.donorClass }}）
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </transition>
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
  background: rgba(245, 158, 11, 0.3);
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

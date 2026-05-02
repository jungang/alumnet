<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { contentApi } from '@/api';
import BottomNavigation from '@/components/BottomNavigation.vue';

const router = useRouter();
const authStore = useAuthStore();

type MessageCategory = 'school' | 'teacher' | 'classmate';
type TabType = 'messages' | 'search' | 'videos';

const activeTab = ref<TabType>('messages');
const messages = ref<any[]>([]);
const searchNotices = ref<any[]>([]);
const videos = ref<any[]>([]);
const featuredVideos = ref<any[]>([]);
const categoryStats = ref<{ category: string; count: number }[]>([]);

// 留言表单
const newMessage = ref('');
const messageCategory = ref<MessageCategory>('school');
const isSubmitting = ref(false);

// 分类筛选
const filterCategory = ref<MessageCategory | ''>('');

// 寻人表单
const searchForm = ref({
  targetName: '',
  targetClass: '',
  description: '',
  story: '',
  contactPreference: 'system',
});

// 寻人搜索
const noticeSearchKeyword = ref('');

// 视频播放
const showVideoModal = ref(false);
const currentVideo = ref<any>(null);

const categoryLabels: Record<MessageCategory, string> = {
  school: '写给母校',
  teacher: '写给恩师',
  classmate: '写给同学',
};

const contactOptions = [
  { value: 'system', label: '通过系统联系' },
  { value: 'email', label: '通过邮箱联系' },
  { value: 'phone', label: '通过电话联系' },
  { value: 'wechat', label: '通过微信联系' },
];

const filteredMessages = computed(() => {
  if (!filterCategory.value) return messages.value;
  return messages.value.filter(m => m.category === filterCategory.value);
});

async function loadMessages() {
  try {
    const res = await contentApi.getMessages({ category: filterCategory.value || undefined });
    if (res.data.success) {
      messages.value = res.data.data;
    }
  } catch (e) {
    console.error('加载留言失败:', e);
  }
}

async function loadCategoryStats() {
  try {
    const res = await contentApi.getMessageStats();
    if (res.data.success) {
      categoryStats.value = res.data.data;
    }
  } catch (e) {
    console.error('加载统计失败:', e);
  }
}

async function loadSearchNotices() {
  try {
    const res = await contentApi.getSearchNotices({ keyword: noticeSearchKeyword.value || undefined });
    if (res.data.success) {
      searchNotices.value = res.data.data;
    }
  } catch (e) {
    console.error('加载寻人启事失败:', e);
  }
}

async function loadVideos() {
  try {
    const [videosRes, featuredRes] = await Promise.all([
      contentApi.getVideoGreetings(),
      contentApi.getFeaturedVideos(),
    ]);
    if (videosRes.data.success) {
      videos.value = videosRes.data.data;
    }
    if (featuredRes.data.success) {
      featuredVideos.value = featuredRes.data.data;
    }
  } catch (e) {
    console.error('加载视频失败:', e);
  }
}

async function submitMessage() {
  if (!newMessage.value.trim()) return;
  
  isSubmitting.value = true;
  try {
    const res = await contentApi.createMessage({ 
      content: newMessage.value,
      category: messageCategory.value,
    });
    if (res.data.success) {
      newMessage.value = '';
      alert('留言已提交，等待审核');
    }
  } catch (e) {
    alert('提交失败，请稍后重试');
  } finally {
    isSubmitting.value = false;
  }
}

async function submitSearchNotice() {
  if (!searchForm.value.targetName.trim()) {
    alert('请填写要寻找的校友姓名');
    return;
  }
  
  if (!authStore.isVerifiedAlumni) {
    alert('请先验证校友身份');
    return;
  }
  
  isSubmitting.value = true;
  try {
    const res = await contentApi.createSearchNotice(searchForm.value);
    if (res.data.success) {
      searchForm.value = { targetName: '', targetClass: '', description: '', story: '', contactPreference: 'system' };
      alert('寻人启事已发布');
      loadSearchNotices();
    }
  } catch (e) {
    alert('发布失败，请稍后重试');
  } finally {
    isSubmitting.value = false;
  }
}

function searchNoticesHandler() {
  loadSearchNotices();
}

function playVideo(video: any) {
  currentVideo.value = video;
  showVideoModal.value = true;
  // 增加观看次数
  contentApi.incrementVideoView(video.id).catch(() => {});
}

function closeVideoModal() {
  showVideoModal.value = false;
  currentVideo.value = null;
}

function getCategoryCount(category: string): number {
  const stat = categoryStats.value.find(s => s.category === category);
  return stat?.count || 0;
}

function goBack() {
  router.push('/');
}

onMounted(() => {
  loadMessages();
  loadCategoryStats();
  loadSearchNotices();
  loadVideos();
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
            <h1 class="text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500">互动寄语</h1>
            <p class="text-[10px] text-teal-200/40 font-mono tracking-[0.3em] uppercase">Messages & Alumni Search</p>
          </div>
        </div>
        <div class="hidden md:flex items-center gap-2 text-xs font-mono text-teal-500/50">
          <span class="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
          留下祝福，寻找同窗
        </div>
      </header>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
    <div class="max-w-4xl mx-auto">
      <!-- Tab切换 - 竖屏可换行或垂直堆叠 -->
      <div class="flex flex-wrap portrait:flex-col gap-4 portrait:gap-2 mb-6">
        <button
          @click="activeTab = 'messages'"
          :class="[
            'px-6 py-3 portrait:px-4 portrait:py-4 portrait:w-full portrait:min-h-[52px] rounded-lg font-semibold transition-colors border text-left',
            activeTab === 'messages' 
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30'
          ]"
        >
          💬 留言板
        </button>
        <button
          @click="activeTab = 'search'"
          :class="[
            'px-6 py-3 portrait:px-4 portrait:py-4 portrait:w-full portrait:min-h-[52px] rounded-lg font-semibold transition-colors border text-left',
            activeTab === 'search' 
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30'
          ]"
        >
          🔎 寻人启事
        </button>
        <button
          @click="activeTab = 'videos'"
          :class="[
            'px-6 py-3 portrait:px-4 portrait:py-4 portrait:w-full portrait:min-h-[52px] rounded-lg font-semibold transition-colors border text-left',
            activeTab === 'videos' 
              ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-teal-400/30'
          ]"
        >
          🎬 视频寄语
        </button>
      </div>

      <!-- 留言板 -->
      <div v-if="activeTab === 'messages'" class="space-y-6">
        <!-- 分类统计 - 竖屏可换行 -->
        <div class="flex flex-wrap gap-4 portrait:gap-2 mb-4">
          <button
            @click="filterCategory = ''; loadMessages()"
            :class="[
              'px-4 py-2 portrait:py-3 portrait:min-h-[48px] rounded-lg text-sm transition-colors',
              filterCategory === '' ? 'bg-teal-500/30 text-teal-300' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            ]"
          >
            全部
          </button>
          <button
            v-for="cat in (['school', 'teacher', 'classmate'] as MessageCategory[])"
            :key="cat"
            @click="filterCategory = cat; loadMessages()"
            :class="[
              'px-4 py-2 portrait:py-3 portrait:min-h-[48px] rounded-lg text-sm transition-colors',
              filterCategory === cat ? 'bg-teal-500/30 text-teal-300' : 'bg-white/5 text-gray-400 hover:bg-white/10'
            ]"
          >
            {{ categoryLabels[cat] }} ({{ getCategoryCount(cat) }})
          </button>
        </div>

        <!-- 发表留言 -->
        <div class="glass-card rounded-xl p-6 portrait:p-4">
          <h3 class="text-lg portrait:text-base font-semibold text-white mb-4">发表留言</h3>
          
          <!-- 分类选择 - 竖屏可换行 -->
          <div class="flex flex-wrap gap-3 portrait:gap-2 mb-4">
            <button
              v-for="cat in (['school', 'teacher', 'classmate'] as MessageCategory[])"
              :key="cat"
              @click="messageCategory = cat"
              :class="[
                'px-4 py-2 portrait:py-3 portrait:min-h-[48px] rounded-lg text-sm transition-colors border',
                messageCategory === cat 
                  ? 'bg-teal-500/20 border-teal-400/50 text-teal-300' 
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              ]"
            >
              {{ categoryLabels[cat] }}
            </button>
          </div>

          <textarea
            v-model="newMessage"
            :placeholder="`写下您${categoryLabels[messageCategory].replace('写给', '对')}的祝福...`"
            class="w-full h-32 portrait:h-40 bg-black/40 border border-white/10 text-white rounded-lg p-4 portrait:p-3 portrait:text-base resize-none focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
          ></textarea>
          <button
            @click="submitMessage"
            :disabled="isSubmitting || !newMessage.trim()"
            class="mt-4 w-full portrait:w-full px-6 py-3 portrait:py-4 portrait:min-h-[52px] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {{ isSubmitting ? '提交中...' : '提交留言' }}
          </button>
        </div>

        <!-- 留言列表 -->
        <div class="space-y-4">
          <div
            v-for="msg in filteredMessages"
            :key="msg.id"
            class="glass-card rounded-xl p-4"
          >
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/30">
                {{ msg.authorName?.[0] || '匿' }}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-white font-semibold">{{ msg.authorName || '匿名' }}</span>
                  <span v-if="msg.authorClass" class="text-teal-400/60 text-sm">{{ msg.authorClass }}</span>
                  <span class="px-2 py-0.5 rounded text-xs bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    {{ categoryLabels[msg.category as MessageCategory] || '写给母校' }}
                  </span>
                </div>
                <p class="text-gray-300 mt-2">{{ msg.content }}</p>
                <p class="text-teal-500/50 text-sm mt-2">
                  {{ new Date(msg.createdAt).toLocaleDateString() }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!filteredMessages.length" class="text-center py-8 text-white/30">
          暂无留言
        </div>
      </div>

      <!-- 寻人启事 -->
      <div v-if="activeTab === 'search'" class="space-y-6">
        <!-- 搜索框 - 竖屏全宽 -->
        <div class="flex portrait:flex-col gap-3">
          <input
            v-model="noticeSearchKeyword"
            placeholder="搜索姓名或班级..."
            class="flex-1 portrait:w-full bg-black/40 border border-white/10 text-white rounded-lg p-3 portrait:p-4 portrait:min-h-[52px] portrait:text-base focus:outline-none focus:border-teal-500/50"
            @keyup.enter="searchNoticesHandler"
          />
          <button
            @click="searchNoticesHandler"
            class="px-6 py-3 portrait:w-full portrait:py-4 portrait:min-h-[52px] bg-teal-500/20 border border-teal-400/50 text-teal-300 rounded-lg hover:bg-teal-500/30 transition-colors"
          >
            搜索
          </button>
        </div>

        <!-- 发布寻人 -->
        <div class="glass-card rounded-xl p-6 portrait:p-4">
          <h3 class="text-lg portrait:text-base font-semibold text-white mb-4">发布寻人启事</h3>
          <p v-if="!authStore.isVerifiedAlumni" class="text-amber-400/80 text-sm portrait:text-xs mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            ⚠️ 需要验证校友身份后才能发布寻人启事
          </p>
          <div class="space-y-4 portrait:space-y-3">
            <input
              v-model="searchForm.targetName"
              placeholder="要寻找的校友姓名 *"
              class="w-full bg-black/40 border border-white/10 text-white rounded-lg p-3 portrait:p-4 portrait:min-h-[52px] portrait:text-base focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
            />
            <input
              v-model="searchForm.targetClass"
              placeholder="班级（如：1985届高三1班）"
              class="w-full bg-black/40 border border-white/10 text-white rounded-lg p-3 portrait:p-4 portrait:min-h-[52px] portrait:text-base focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
            />
            <textarea
              v-model="searchForm.description"
              placeholder="描述（外貌特征、最后联系时间等）"
              class="w-full h-24 portrait:h-32 bg-black/40 border border-white/10 text-white rounded-lg p-3 portrait:p-4 portrait:text-base resize-none focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
            ></textarea>
            <select
              v-model="searchForm.contactPreference"
              class="w-full bg-black/40 border border-white/10 text-white rounded-lg p-3 portrait:p-4 portrait:min-h-[52px] portrait:text-base focus:outline-none focus:border-teal-500/50"
            >
              <option v-for="opt in contactOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <button
              @click="submitSearchNotice"
              :disabled="isSubmitting || !authStore.isVerifiedAlumni"
              class="w-full px-6 py-3 portrait:py-4 portrait:min-h-[52px] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-bold rounded-lg shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {{ isSubmitting ? '发布中...' : '发布寻人启事' }}
            </button>
          </div>
        </div>

        <!-- 寻人列表 -->
        <div class="space-y-4">
          <div
            v-for="notice in searchNotices"
            :key="notice.id"
            class="glass-card rounded-xl p-4"
          >
            <div class="flex items-start justify-between">
              <div>
                <h4 class="text-white font-semibold text-lg">寻找：{{ notice.targetName }}</h4>
                <p v-if="notice.targetClass" class="text-teal-400/60 text-sm">{{ notice.targetClass }}</p>
              </div>
              <span :class="[
                'px-2 py-1 rounded text-xs border',
                notice.status === 'active' ? 'bg-teal-500/10 border-teal-500/20 text-teal-300' : 'bg-green-500/10 border-green-500/20 text-green-300'
              ]">
                {{ notice.status === 'active' ? '寻找中' : '已找到' }}
              </span>
            </div>
            <p v-if="notice.description" class="text-gray-300 mt-3">{{ notice.description }}</p>
            <p v-if="notice.reunionStory && notice.status === 'found'" class="text-green-300/80 mt-3 p-3 bg-green-500/10 rounded-lg">
              🎉 重逢故事：{{ notice.reunionStory }}
            </p>
            <p class="text-teal-500/50 text-sm mt-2">
              发布于 {{ new Date(notice.createdAt).toLocaleDateString() }}
            </p>
          </div>
        </div>

        <div v-if="!searchNotices.length" class="text-center py-8 text-white/30">
          暂无寻人启事
        </div>
      </div>

      <!-- 视频寄语墙 -->
      <div v-if="activeTab === 'videos'" class="space-y-6">
        <!-- 精选视频轮播 - 竖屏2列 -->
        <div v-if="featuredVideos.length" class="glass-card rounded-xl p-6 portrait:p-4">
          <h3 class="text-lg portrait:text-base font-semibold text-white mb-4">🌟 精选寄语</h3>
          <div class="grid grid-cols-1 portrait:grid-cols-2 landscape:grid-cols-2 landscape:lg:grid-cols-3 gap-4 portrait:gap-3">
            <div
              v-for="video in featuredVideos"
              :key="video.id"
              @click="playVideo(video)"
              class="relative cursor-pointer group rounded-lg overflow-hidden"
            >
              <div class="aspect-video bg-black/40 flex items-center justify-center">
                <img 
                  v-if="video.thumbnailUrl" 
                  :src="video.thumbnailUrl" 
                  :alt="video.title"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-4xl portrait:text-3xl">🎬</span>
              </div>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 portrait:opacity-100 transition-opacity flex items-center justify-center">
                <div class="w-16 h-16 portrait:w-12 portrait:h-12 rounded-full bg-teal-500/80 flex items-center justify-center">
                  <svg class="w-8 h-8 portrait:w-6 portrait:h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              <div class="absolute bottom-0 left-0 right-0 p-3 portrait:p-2 bg-gradient-to-t from-black/80">
                <p class="text-white font-semibold text-sm portrait:text-xs truncate">{{ video.title }}</p>
                <p class="text-teal-300/60 text-xs portrait:text-[10px]">{{ video.alumniName }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 全部视频 - 竖屏2列 -->
        <div class="glass-card rounded-xl p-6 portrait:p-4">
          <h3 class="text-lg portrait:text-base font-semibold text-white mb-4">全部视频寄语</h3>
          <div class="grid grid-cols-2 portrait:grid-cols-2 landscape:grid-cols-3 landscape:lg:grid-cols-4 gap-4 portrait:gap-3">
            <div
              v-for="video in videos"
              :key="video.id"
              @click="playVideo(video)"
              class="relative cursor-pointer group rounded-lg overflow-hidden"
            >
              <div class="aspect-video bg-black/40 flex items-center justify-center">
                <img 
                  v-if="video.thumbnailUrl" 
                  :src="video.thumbnailUrl" 
                  :alt="video.title"
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-3xl portrait:text-2xl">🎬</span>
              </div>
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 portrait:opacity-100 transition-opacity flex items-center justify-center">
                <div class="w-12 h-12 portrait:w-10 portrait:h-10 rounded-full bg-teal-500/80 flex items-center justify-center">
                  <svg class="w-6 h-6 portrait:w-5 portrait:h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
              <div class="p-2 portrait:p-1.5">
                <p class="text-white text-sm portrait:text-xs truncate">{{ video.title }}</p>
                <p class="text-teal-300/60 text-xs portrait:text-[10px]">{{ video.alumniName }} · {{ video.viewCount || 0 }}次观看</p>
              </div>
            </div>
          </div>
          <div v-if="!videos.length" class="text-center py-8 text-white/30">
            暂无视频寄语
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>

    <!-- 视频播放模态框 -->
    <div v-if="showVideoModal && currentVideo" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" @click.self="closeVideoModal">
      <div class="bg-[#0a0f14] rounded-xl max-w-4xl w-full mx-4 overflow-hidden">
        <div class="p-4 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 class="text-white font-semibold">{{ currentVideo.title }}</h3>
            <p class="text-teal-300/60 text-sm">{{ currentVideo.alumniName }} {{ currentVideo.alumniClass ? `· ${currentVideo.alumniClass}` : '' }}</p>
          </div>
          <button @click="closeVideoModal" class="text-white/60 hover:text-white">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="aspect-video bg-black">
          <video 
            :src="currentVideo.videoUrl" 
            controls 
            autoplay
            class="w-full h-full"
          ></video>
        </div>
        <div v-if="currentVideo.description" class="p-4 border-t border-white/10">
          <p class="text-gray-300 text-sm">{{ currentVideo.description }}</p>
        </div>
      </div>
    </div>
    
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
</style>


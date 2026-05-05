<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api';
import BottomNavigation from '@/components/BottomNavigation.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { useThemeStore } from '@/stores/theme';

const router = useRouter();
const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);

// 状态
const step = ref<'find' | 'main' | 'classmates' | 'edit' | 'handshake'>('find');
const identifier = ref('');
const graduationYear = ref<number | null>(null);
const token = ref('');
const profile = ref<any>(null);
const classmates = ref<any[]>([]);
const incomingHandshakes = ref<any[]>([]);
const outgoingHandshakes = ref<any[]>([]);
const loading = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');

// 编辑表单
const editForm = ref({
  industry: '',
  biography: '',
  email: '',
  phone: '',
  title: '',
});

// 查找自己
async function findMe() {
  if (!identifier.value) return;
  loading.value = true;
  message.value = '';

  try {
    const res = await api.post('/self-service/find-me', {
      identifier: identifier.value,
      graduationYear: graduationYear.value || undefined,
    });

    if (res.data.success) {
      profile.value = res.data.data.profile;
      token.value = res.data.data.token;
      step.value = 'main';
      // 填充编辑表单
      editForm.value = {
        industry: profile.value.industry || '',
        biography: profile.value.biography || '',
        email: profile.value.email || '',
        phone: profile.value.phone || '',
        title: profile.value.title || '',
      };
    } else {
      messageType.value = 'error';
      message.value = res.data.message || '未找到匹配的校友档案';
    }
  } catch {
    messageType.value = 'error';
    message.value = '查询失败，请重试';
  } finally {
    loading.value = false;
  }
}

// 获取同班同学
async function loadClassmates() {
  loading.value = true;
  try {
    const res = await api.get('/self-service/classmates', {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    classmates.value = res.data.data || [];
    step.value = 'classmates';
  } catch {
    messageType.value = 'error';
    message.value = '加载失败';
  } finally {
    loading.value = false;
  }
}

// 更新信息
async function saveProfile() {
  loading.value = true;
  try {
    const res = await api.patch('/self-service/my-profile', editForm.value, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    if (res.data.success) {
      profile.value = res.data.data;
      messageType.value = 'success';
      message.value = '信息更新成功！';
      step.value = 'main';
    }
  } catch {
    messageType.value = 'error';
    message.value = '更新失败';
  } finally {
    loading.value = false;
  }
}

// 发起握手
async function requestHandshake(targetId: string) {
  try {
    const res = await api.post('/self-service/handshake', { targetId }, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    if (res.data.success) {
      messageType.value = 'success';
      message.value = '握手请求已发送！';
    }
  } catch (err: any) {
    messageType.value = 'error';
    message.value = err.response?.data?.message || '握手请求失败';
  }
}

// 加载握手请求
async function loadHandshakes() {
  loading.value = true;
  try {
    const [inRes, outRes] = await Promise.all([
      api.get('/self-service/handshake/incoming', {
        headers: { Authorization: `Bearer ${token.value}` },
      }),
      api.get('/self-service/handshake/outgoing', {
        headers: { Authorization: `Bearer ${token.value}` },
      }),
    ]);
    incomingHandshakes.value = inRes.data.data || [];
    outgoingHandshakes.value = outRes.data.data || [];
    step.value = 'handshake';
  } catch {
    messageType.value = 'error';
    message.value = '加载失败';
  } finally {
    loading.value = false;
  }
}

// 响应握手
async function respondHandshake(id: string, accept: boolean) {
  try {
    const res = await api.post(`/self-service/handshake/${id}/respond`, { accept }, {
      headers: { Authorization: `Bearer ${token.value}` },
    });
    if (res.data.success) {
      loadHandshakes();
    }
  } catch {
    messageType.value = 'error';
    message.value = '操作失败';
  }
}

function goHome() {
  router.push('/');
}
</script>

<template>
  <div class="relative w-full min-h-screen overflow-hidden font-sans pb-20 transition-colors duration-300"
    :class="isDark ? 'bg-[#020608] text-white' : 'bg-[#faf8f5] text-[#2d1810]'">
    
    <!-- 背景装饰 -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div class="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
        :class="isDark ? 'bg-teal-500' : 'bg-[#8b2500]'" />
      <div class="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-10"
        :class="isDark ? 'bg-teal-500' : 'bg-[#8b2500]'" />
    </div>

    <div class="relative z-10 w-full p-6 lg:p-10 max-w-lg mx-auto">
      <!-- 头部 -->
      <header class="flex items-center justify-between mb-8 pb-4 border-b transition-colors duration-300"
        :class="isDark ? 'border-teal-500/20' : 'border-[#8b2500]/20'">
        <div class="flex items-center gap-3">
          <button @click="goHome" class="touch-target text-2xl">←</button>
          <h1 class="text-xl lg:text-2xl font-bold">校友中心</h1>
        </div>
        <ThemeToggle />
      </header>

      <!-- 消息提示 -->
      <div v-if="message" class="mb-4 p-3 rounded-lg text-sm"
        :class="messageType === 'success'
          ? (isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-green-50 text-green-700')
          : (isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700')">
        {{ message }}
      </div>

      <!-- Step 1: 查找自己 -->
      <div v-if="step === 'find'" class="space-y-6">
        <div class="text-center py-8">
          <div class="text-5xl mb-4">🎓</div>
          <h2 class="text-lg font-bold mb-2">找到你的档案</h2>
          <p class="text-sm opacity-60">输入姓名或学号，开始你的校友之旅</p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1 opacity-80">姓名或学号 *</label>
            <input v-model="identifier" type="text" placeholder="请输入姓名或学号"
              class="touch-target w-full px-4 py-3 rounded-xl border text-base transition-colors"
              :class="isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-teal-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500'"
              @keyup.enter="findMe" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 opacity-80">毕业年份（可选）</label>
            <input v-model.number="graduationYear" type="number" placeholder="如 2020"
              class="touch-target w-full px-4 py-3 rounded-xl border text-base transition-colors"
              :class="isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-teal-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500'"
              @keyup.enter="findMe" />
          </div>
          <button @click="findMe" :disabled="loading || !identifier"
            class="touch-target w-full py-3 rounded-xl font-medium text-base transition-all"
            :class="isDark
              ? 'bg-teal-500 text-white hover:bg-teal-400 disabled:opacity-50'
              : 'bg-[#8b2500] text-white hover:bg-[#6d1d00] disabled:opacity-50'">
            {{ loading ? '查找中...' : '查找我的档案' }}
          </button>
        </div>
      </div>

      <!-- Step 2: 主菜单 -->
      <div v-if="step === 'main'" class="space-y-6">
        <!-- 个人信息卡 -->
        <div class="p-5 rounded-xl border transition-colors"
          :class="isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              :class="isDark ? 'bg-teal-500/20' : 'bg-teal-50'">
              {{ profile?.name?.[0] || '?' }}
            </div>
            <div>
              <h3 class="text-lg font-bold">{{ profile?.name }}</h3>
              <p class="text-sm opacity-60">{{ profile?.class_name }} · {{ profile?.graduation_year }}届</p>
              <p v-if="profile?.industry" class="text-sm opacity-60">{{ profile?.industry }}</p>
            </div>
          </div>
        </div>

        <!-- 功能卡片 -->
        <div class="grid grid-cols-1 gap-3">
          <button @click="loadClassmates"
            class="touch-target p-4 rounded-xl border text-left transition-all flex items-center gap-4"
            :class="isDark ? 'bg-white/5 border-white/10 hover:border-teal-500/50' : 'bg-white border-gray-200 hover:border-teal-500'">
            <span class="text-3xl">👥</span>
            <div>
              <div class="font-medium">查看同班同学</div>
              <div class="text-sm opacity-60">找到你的同学，重新建立联系</div>
            </div>
          </button>

          <button @click="step = 'edit'"
            class="touch-target p-4 rounded-xl border text-left transition-all flex items-center gap-4"
            :class="isDark ? 'bg-white/5 border-white/10 hover:border-teal-500/50' : 'bg-white border-gray-200 hover:border-teal-500'">
            <span class="text-3xl">✏️</span>
            <div>
              <div class="font-medium">更新我的信息</div>
              <div class="text-sm opacity-60">修改行业、简介、联系方式</div>
            </div>
          </button>

          <button @click="loadHandshakes"
            class="touch-target p-4 rounded-xl border text-left transition-all flex items-center gap-4"
            :class="isDark ? 'bg-white/5 border-white/10 hover:border-teal-500/50' : 'bg-white border-gray-200 hover:border-teal-500'">
            <span class="text-3xl">🤝</span>
            <div>
              <div class="font-medium">隐私握手</div>
              <div class="text-sm opacity-60">请求查看同学的联系方式</div>
            </div>
          </button>
        </div>
      </div>

      <!-- 同班同学 -->
      <div v-if="step === 'classmates'" class="space-y-4">
        <div class="flex items-center gap-3 mb-4">
          <button @click="step = 'main'" class="touch-target text-xl">←</button>
          <h2 class="text-lg font-bold">同班同学 ({{ classmates.length }})</h2>
        </div>

        <div v-if="classmates.length === 0" class="text-center py-12 opacity-50">
          暂无同班同学信息
        </div>

        <div v-for="m in classmates" :key="m.id"
          class="p-4 rounded-xl border transition-colors flex items-center justify-between"
          :class="isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'">
          <div>
            <div class="font-medium">{{ m.name }}</div>
            <div class="text-sm opacity-60">{{ m.industry || '暂无行业信息' }}</div>
          </div>
          <button @click="requestHandshake(m.id)"
            class="touch-target px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            :class="isDark ? 'bg-teal-500/20 text-teal-300 hover:bg-teal-500/30' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'">
            🤝 握手
          </button>
        </div>
      </div>

      <!-- 编辑信息 -->
      <div v-if="step === 'edit'" class="space-y-4">
        <div class="flex items-center gap-3 mb-4">
          <button @click="step = 'main'" class="touch-target text-xl">←</button>
          <h2 class="text-lg font-bold">更新我的信息</h2>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1 opacity-80">行业</label>
            <input v-model="editForm.industry" type="text" placeholder="如：科技、教育、金融"
              class="touch-target w-full px-4 py-3 rounded-xl border text-base"
              :class="isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 opacity-80">职务</label>
            <input v-model="editForm.title" type="text" placeholder="如：高级工程师"
              class="touch-target w-full px-4 py-3 rounded-xl border text-base"
              :class="isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 opacity-80">个人简介</label>
            <textarea v-model="editForm.biography" rows="3" placeholder="简单介绍自己"
              class="touch-target w-full px-4 py-3 rounded-xl border text-base resize-none"
              :class="isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 opacity-80">邮箱</label>
            <input v-model="editForm.email" type="email" placeholder="your@email.com"
              class="touch-target w-full px-4 py-3 rounded-xl border text-base"
              :class="isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 opacity-80">电话</label>
            <input v-model="editForm.phone" type="tel" placeholder="138-xxxx-xxxx"
              class="touch-target w-full px-4 py-3 rounded-xl border text-base"
              :class="isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'" />
          </div>

          <button @click="saveProfile" :disabled="loading"
            class="touch-target w-full py-3 rounded-xl font-medium text-base transition-all"
            :class="isDark ? 'bg-teal-500 text-white hover:bg-teal-400' : 'bg-[#8b2500] text-white hover:bg-[#6d1d00]'">
            {{ loading ? '保存中...' : '保存更新' }}
          </button>
        </div>
      </div>

      <!-- 隐私握手 -->
      <div v-if="step === 'handshake'" class="space-y-4">
        <div class="flex items-center gap-3 mb-4">
          <button @click="step = 'main'" class="touch-target text-xl">←</button>
          <h2 class="text-lg font-bold">隐私握手</h2>
        </div>

        <!-- 收到的请求 -->
        <div v-if="incomingHandshakes.length > 0">
          <h3 class="font-medium mb-2 opacity-80">收到的请求</h3>
          <div v-for="h in incomingHandshakes" :key="h.id"
            class="p-4 rounded-xl border mb-2 transition-colors flex items-center justify-between"
            :class="isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'">
            <div>
              <div class="font-medium">{{ h.requester_name }}</div>
              <div class="text-xs opacity-50">{{ new Date(h.created_at).toLocaleDateString() }}</div>
            </div>
            <div v-if="h.status === 'pending'" class="flex gap-2">
              <button @click="respondHandshake(h.id, true)"
                class="touch-target px-3 py-1 rounded-lg text-sm bg-teal-500 text-white">接受</button>
              <button @click="respondHandshake(h.id, false)"
                class="touch-target px-3 py-1 rounded-lg text-sm border"
                :class="isDark ? 'border-white/20 text-white/60' : 'border-gray-300 text-gray-500'">拒绝</button>
            </div>
            <span v-else class="text-sm px-2 py-1 rounded"
              :class="h.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
              {{ h.status === 'accepted' ? '已接受' : '已拒绝' }}
            </span>
          </div>
        </div>

        <!-- 发出的请求 -->
        <div v-if="outgoingHandshakes.length > 0">
          <h3 class="font-medium mb-2 opacity-80">发出的请求</h3>
          <div v-for="h in outgoingHandshakes" :key="h.id"
            class="p-4 rounded-xl border mb-2 transition-colors flex items-center justify-between"
            :class="isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'">
            <div>
              <div class="font-medium">{{ h.target_name }}</div>
              <div class="text-xs opacity-50">{{ new Date(h.created_at).toLocaleDateString() }}</div>
            </div>
            <span class="text-sm px-2 py-1 rounded"
              :class="h.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : h.status === 'accepted' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
              {{ h.status === 'pending' ? '等待中' : h.status === 'accepted' ? '已接受' : '已拒绝' }}
            </span>
          </div>
        </div>

        <div v-if="incomingHandshakes.length === 0 && outgoingHandshakes.length === 0"
          class="text-center py-12 opacity-50">
          暂无握手请求<br />
          <span class="text-sm">去「同班同学」页面发起握手吧</span>
        </div>
      </div>
    </div>

    <BottomNavigation />
  </div>
</template>

<style scoped>
input:focus, textarea:focus {
  outline: none;
  border-color: #14b8a6;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.15);
}
</style>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import api from '@/api';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'selectAlumni', alumni: any): void;
}>();

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  relatedAlumni?: any[];
  isLoading?: boolean;
}

const messages = ref<Message[]>([
  {
    id: '0',
    role: 'system',
    content: '您好！我是示例学校校史馆 AI 助手，可以帮您查询校友信息、了解学校历史、解答相关问题。\n\n您可以这样问我：\n• "查找80年代毕业的杰出校友"\n• "有哪些校友在科技领域工作？"\n• "介绍一下学校的历史"\n• "有哪些杰出校友？"',
    timestamp: new Date(),
  }
]);

const inputText = ref('');
const isLoading = ref(false);
const chatContainerRef = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight;
  }
};

const sendMessage = async () => {
  const text = inputText.value.trim();
  if (!text || isLoading.value) return;

  const userMsg: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: text,
    timestamp: new Date(),
  };
  messages.value.push(userMsg);
  inputText.value = '';
  
  const loadingMsg: Message = {
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isLoading: true,
  };
  messages.value.push(loadingMsg);
  isLoading.value = true;
  scrollToBottom();

  try {
    const res = await api.post('/alumni/rag-query', { query: text }, { timeout: 30000 });
    const lastMsg = messages.value[messages.value.length - 1];
    if (res.data.success) {
      lastMsg.content = res.data.data.answer || '抱歉，我没有找到相关信息。';
      lastMsg.relatedAlumni = res.data.data.relatedAlumni || [];
    } else {
      lastMsg.content = res.data.message || '抱歉，查询出现问题，请稍后重试。';
    }
    lastMsg.isLoading = false;
  } catch (error: any) {
    const lastMsg = messages.value[messages.value.length - 1];
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      lastMsg.content = 'AI 响应超时，请稍后重试或尝试更简短的问题。';
    } else if (error.response?.status === 500) {
      lastMsg.content = '服务器繁忙，请稍后重试。您也可以使用左侧的精确筛选功能查找校友。';
    } else {
      lastMsg.content = '网络连接失败，请检查网络后重试。';
    }
    lastMsg.isLoading = false;
    console.error('RAG查询错误:', error);
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

const quickQuestions = [
  '介绍一下学校的历史',
  '有哪些杰出校友？',
  '80年代毕业的校友',
  '在科技领域工作的校友',
];

const askQuickQuestion = (q: string) => {
  inputText.value = q;
  sendMessage();
};

const handleAlumniClick = (alumni: any) => {
  emit('selectAlumni', alumni);
};

const clearChat = () => {
  messages.value = [messages.value[0]];
};

watch(() => props.visible, (val) => {
  if (val) nextTick(() => scrollToBottom());
});

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="emit('close')"></div>
        
        <!-- 竖屏时全屏显示 -->
        <div class="relative w-full max-w-4xl portrait:max-w-none h-[85vh] portrait:h-full mx-4 portrait:mx-0 bg-[#0a0f1a] border border-teal-500/20 portrait:border-0 rounded-2xl portrait:rounded-none shadow-2xl shadow-teal-500/10 flex flex-col overflow-hidden">
          <header class="flex items-center justify-between px-6 portrait:px-4 py-4 portrait:py-3 border-b border-teal-500/20 bg-gradient-to-r from-teal-900/20 to-transparent shrink-0">
            <div class="flex items-center gap-4 portrait:gap-3">
              <div class="w-12 h-12 portrait:w-10 portrait:h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <svg class="w-6 h-6 portrait:w-5 portrait:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 class="text-xl portrait:text-lg font-bold text-white">AI 智能助手</h2>
                <p class="text-xs portrait:text-[10px] text-teal-400/60 font-mono portrait:hidden">Yuwen Alumni AI Assistant v2.0</p>
              </div>
            </div>
            <div class="flex items-center gap-3 portrait:gap-2">
              <button @click="clearChat" class="px-3 py-1.5 portrait:px-2 portrait:py-1 text-xs text-teal-400/70 hover:text-teal-300 hover:bg-teal-500/10 rounded-lg transition-colors">清空</button>
              <button @click="emit('close')" class="w-10 h-10 portrait:w-9 portrait:h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors group touch-target">
                <svg class="w-5 h-5 text-white/60 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div ref="chatContainerRef" class="flex-1 overflow-y-auto p-6 portrait:p-4 space-y-6 portrait:space-y-4 custom-scrollbar">
            <div v-for="msg in messages" :key="msg.id" class="flex gap-4" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
              <div class="shrink-0">
                <div v-if="msg.role === 'user'" class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>

              <div class="flex-1 max-w-[80%]" :class="msg.role === 'user' ? 'text-right' : ''">
                <div 
                  class="inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                  :class="msg.role === 'user' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'"
                >
                  <div v-if="msg.isLoading" class="flex items-center gap-2">
                    <div class="flex gap-1">
                      <span class="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                      <span class="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                      <span class="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                    </div>
                    <span class="text-teal-400/70">思考中...</span>
                  </div>
                  <template v-else>{{ msg.content }}</template>
                </div>

                <div v-if="msg.relatedAlumni?.length" class="mt-4 portrait:mt-3 grid grid-cols-2 portrait:grid-cols-1 gap-3 portrait:gap-2">
                  <div 
                    v-for="alumni in msg.relatedAlumni.slice(0, 4)" 
                    :key="alumni.id"
                    @click="handleAlumniClick(alumni)"
                    class="p-3 bg-white/5 border border-teal-500/20 rounded-xl cursor-pointer hover:bg-teal-500/10 hover:border-teal-400/40 transition-all group"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-cyan-700 flex items-center justify-center text-white font-bold">
                        {{ alumni.name?.[0] || '?' }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white group-hover:text-teal-300 truncate">{{ alumni.name }}</p>
                        <p class="text-xs text-gray-500">{{ alumni.graduationYear }}届 · {{ alumni.className || alumni.industry || '' }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <p class="text-[10px] text-white/30 mt-2 font-mono">
                  {{ msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="messages.length <= 2" class="px-6 pb-4">
            <p class="text-xs text-white/40 mb-3">快捷提问：</p>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="q in quickQuestions" 
                :key="q"
                @click="askQuickQuestion(q)"
                class="px-3 py-1.5 text-xs bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-full hover:bg-teal-500/20 hover:border-teal-400/40 transition-all"
              >{{ q }}</button>
            </div>
          </div>

          <div class="p-4 portrait:p-3 border-t border-teal-500/20 bg-black/30 shrink-0">
            <div class="flex items-end gap-3 portrait:gap-2">
              <div class="flex-1 relative">
                <textarea
                  v-model="inputText"
                  @keydown="handleKeydown"
                  placeholder="输入您的问题..."
                  rows="1"
                  class="w-full px-4 py-3 portrait:px-3 portrait:py-2.5 bg-white/5 border border-white/10 rounded-xl text-white portrait:text-sm placeholder-white/30 resize-none focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                  :disabled="isLoading"
                ></textarea>
              </div>
              <button
                @click="sendMessage"
                :disabled="!inputText.trim() || isLoading"
                class="w-12 h-12 portrait:w-11 portrait:h-11 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-target"
              >
                <svg v-if="!isLoading" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </button>
            </div>
            <p class="text-[10px] text-white/30 mt-2 text-center portrait:hidden">AI 助手基于校友数据库和知识库提供智能回答</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active, .dialog-leave-active { transition: all 0.3s ease; }
.dialog-enter-from, .dialog-leave-to { opacity: 0; }
.dialog-enter-from > div:last-child, .dialog-leave-to > div:last-child { transform: scale(0.95) translateY(20px); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(20, 184, 166, 0.2); border-radius: 3px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(20, 184, 166, 0.4); }
textarea { min-height: 48px; max-height: 120px; }
</style>

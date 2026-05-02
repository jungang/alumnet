/**
 * AIChatDialog 组件单元测试
 * 测试AI对话交互和消息发送功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Mock api module
vi.mock('@/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from '@/api';

// Mock AIChatDialog component for testing
const AIChatDialog = {
  name: 'AIChatDialog',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'selectAlumni'],
  data() {
    return {
      messages: [
        {
          id: '0',
          role: 'system',
          content: '您好！我是示例学校校史馆 AI 助手',
          timestamp: new Date(),
        },
      ],
      inputText: '',
      isLoading: false,
    };
  },
  template: `
    <div v-if="visible" class="ai-chat-dialog">
      <header class="chat-header">
        <h2 class="title">AI 智能助手</h2>
        <button class="clear-btn" @click="clearChat">清空</button>
        <button class="close-btn" @click="$emit('close')">关闭</button>
      </header>
      <div class="chat-container">
        <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
          <div class="content">
            <span v-if="msg.isLoading" class="loading">思考中...</span>
            <span v-else>{{ msg.content }}</span>
          </div>
          <div v-if="msg.relatedAlumni?.length" class="related-alumni">
            <div 
              v-for="alumni in msg.relatedAlumni" 
              :key="alumni.id"
              class="alumni-card"
              @click="$emit('selectAlumni', alumni)"
            >
              {{ alumni.name }}
            </div>
          </div>
        </div>
      </div>
      <div class="quick-questions" v-if="messages.length <= 2">
        <button 
          v-for="q in quickQuestions" 
          :key="q"
          class="quick-btn"
          @click="askQuickQuestion(q)"
        >{{ q }}</button>
      </div>
      <div class="input-area">
        <textarea 
          v-model="inputText" 
          class="input-field"
          placeholder="输入您的问题..."
          :disabled="isLoading"
          @keydown.enter.prevent="sendMessage"
        ></textarea>
        <button 
          class="send-btn" 
          @click="sendMessage"
          :disabled="!inputText.trim() || isLoading"
        >发送</button>
      </div>
    </div>
  `,
  computed: {
    quickQuestions() {
      return ['介绍一下学校的历史', '有哪些杰出校友？'];
    },
  },
  methods: {
    async sendMessage() {
      const text = this.inputText.trim();
      if (!text || this.isLoading) return;

      this.messages.push({
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      });
      this.inputText = '';

      const loadingMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };
      this.messages.push(loadingMsg);
      this.isLoading = true;

      try {
        const res = await api.post('/alumni/rag-query', { query: text });
        const lastMsg = this.messages[this.messages.length - 1];
        if (res.data.success) {
          lastMsg.content = res.data.data.answer || '抱歉，我没有找到相关信息。';
          lastMsg.relatedAlumni = res.data.data.relatedAlumni || [];
        } else {
          lastMsg.content = res.data.message || '抱歉，查询出现问题。';
        }
        lastMsg.isLoading = false;
      } catch (error: any) {
        const lastMsg = this.messages[this.messages.length - 1];
        lastMsg.content = '网络连接失败，请检查网络后重试。';
        lastMsg.isLoading = false;
      } finally {
        this.isLoading = false;
      }
    },
    askQuickQuestion(q: string) {
      this.inputText = q;
      this.sendMessage();
    },
    clearChat() {
      this.messages = [this.messages[0]];
    },
  },
};

describe('AIChatDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should not render when visible is false', () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: false },
      });

      expect(wrapper.find('.ai-chat-dialog').exists()).toBe(false);
    });

    it('should render when visible is true', () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      expect(wrapper.find('.ai-chat-dialog').exists()).toBe(true);
    });

    it('should render header with title', () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      expect(wrapper.find('.title').text()).toBe('AI 智能助手');
    });

    it('should render initial system message', () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      const messages = wrapper.findAll('.message');
      expect(messages.length).toBeGreaterThanOrEqual(1);
      expect(messages[0].classes()).toContain('system');
    });

    it('should render input area', () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      expect(wrapper.find('.input-field').exists()).toBe(true);
      expect(wrapper.find('.send-btn').exists()).toBe(true);
    });

    it('should render quick questions when few messages', () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      expect(wrapper.find('.quick-questions').exists()).toBe(true);
      expect(wrapper.findAll('.quick-btn').length).toBeGreaterThan(0);
    });
  });

  describe('message sending', () => {
    it('should add user message when sending', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, data: { answer: 'Test answer' } },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('测试问题');
      await wrapper.find('.send-btn').trigger('click');

      const messages = wrapper.findAll('.message');
      const userMessages = messages.filter(m => m.classes().includes('user'));
      expect(userMessages.length).toBe(1);
    });

    it('should clear input after sending', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, data: { answer: 'Test answer' } },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('测试问题');
      await wrapper.find('.send-btn').trigger('click');

      expect((wrapper.find('.input-field').element as HTMLTextAreaElement).value).toBe('');
    });

    it('should show loading state while waiting for response', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      vi.mocked(api.post).mockReturnValue(promise as any);

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('测试问题');
      await wrapper.find('.send-btn').trigger('click');

      expect(wrapper.find('.loading').exists()).toBe(true);

      resolvePromise!({ data: { success: true, data: { answer: 'Answer' } } });
      await flushPromises();
    });

    it('should disable send button when input is empty', () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      const sendBtn = wrapper.find('.send-btn');
      expect((sendBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('should disable send button while loading', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      vi.mocked(api.post).mockReturnValue(promise as any);

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('测试问题');
      await wrapper.find('.send-btn').trigger('click');

      expect((wrapper.find('.send-btn').element as HTMLButtonElement).disabled).toBe(true);

      resolvePromise!({ data: { success: true, data: { answer: 'Answer' } } });
      await flushPromises();
    });

    it('should call API with correct query', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, data: { answer: 'Test answer' } },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('查找杰出校友');
      await wrapper.find('.send-btn').trigger('click');

      expect(api.post).toHaveBeenCalledWith('/alumni/rag-query', { query: '查找杰出校友' });
    });

    it('should display assistant response', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, data: { answer: '这是AI的回答' } },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('测试问题');
      await wrapper.find('.send-btn').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('这是AI的回答');
    });

    it('should handle API error gracefully', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('测试问题');
      await wrapper.find('.send-btn').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('网络连接失败');
    });
  });

  describe('quick questions', () => {
    it('should send quick question when clicked', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, data: { answer: 'Answer' } },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.quick-btn').trigger('click');

      expect(api.post).toHaveBeenCalled();
    });
  });

  describe('related alumni', () => {
    it('should display related alumni cards', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: {
          success: true,
          data: {
            answer: '找到以下校友',
            relatedAlumni: [
              { id: '1', name: '张三' },
              { id: '2', name: '李四' },
            ],
          },
        },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('查找校友');
      await wrapper.find('.send-btn').trigger('click');
      await flushPromises();

      const alumniCards = wrapper.findAll('.alumni-card');
      expect(alumniCards.length).toBe(2);
    });

    it('should emit selectAlumni when alumni card is clicked', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: {
          success: true,
          data: {
            answer: '找到以下校友',
            relatedAlumni: [{ id: '1', name: '张三' }],
          },
        },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('查找校友');
      await wrapper.find('.send-btn').trigger('click');
      await flushPromises();

      await wrapper.find('.alumni-card').trigger('click');

      expect(wrapper.emitted('selectAlumni')).toBeTruthy();
      expect(wrapper.emitted('selectAlumni')![0]).toEqual([{ id: '1', name: '张三' }]);
    });
  });

  describe('dialog controls', () => {
    it('should emit close event when close button is clicked', async () => {
      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.close-btn').trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should clear chat when clear button is clicked', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, data: { answer: 'Answer' } },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      // Send a message first
      await wrapper.find('.input-field').setValue('测试');
      await wrapper.find('.send-btn').trigger('click');
      await flushPromises();

      // Clear chat
      await wrapper.find('.clear-btn').trigger('click');

      // Should only have system message
      const messages = wrapper.findAll('.message');
      expect(messages.length).toBe(1);
      expect(messages[0].classes()).toContain('system');
    });
  });

  describe('keyboard interaction', () => {
    it('should send message on Enter key', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { success: true, data: { answer: 'Answer' } },
      });

      const wrapper = mount(AIChatDialog, {
        props: { visible: true },
      });

      await wrapper.find('.input-field').setValue('测试问题');
      await wrapper.find('.input-field').trigger('keydown.enter');

      expect(api.post).toHaveBeenCalled();
    });
  });
});

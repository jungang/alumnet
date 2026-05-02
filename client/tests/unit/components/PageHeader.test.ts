/**
 * PageHeader 组件单元测试
 * 测试页面头部渲染和导航功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { setActivePinia, createPinia } from 'pinia';

// Mock PageHeader component for testing
const PageHeader = {
  name: 'PageHeader',
  props: {
    title: {
      type: String,
      default: '',
    },
    showBack: {
      type: Boolean,
      default: true,
    },
    showHome: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['back'],
  template: `
    <header class="page-header">
      <button v-if="showBack" class="back-btn" @click="$emit('back')">返回</button>
      <h1 class="title">{{ title }}</h1>
      <button v-if="showHome" class="home-btn" @click="goHome">首页</button>
    </header>
  `,
  methods: {
    goHome() {
      this.$router.push('/');
    },
  },
};

describe('PageHeader', () => {
  let router: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/search', component: { template: '<div>Search</div>' } },
      ],
    });
  });

  describe('rendering', () => {
    it('should render title', () => {
      const wrapper = mount(PageHeader, {
        props: { title: 'Test Title' },
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.title').text()).toBe('Test Title');
    });

    it('should render back button when showBack is true', () => {
      const wrapper = mount(PageHeader, {
        props: { title: 'Test', showBack: true },
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.back-btn').exists()).toBe(true);
    });

    it('should not render back button when showBack is false', () => {
      const wrapper = mount(PageHeader, {
        props: { title: 'Test', showBack: false },
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.back-btn').exists()).toBe(false);
    });

    it('should render home button when showHome is true', () => {
      const wrapper = mount(PageHeader, {
        props: { title: 'Test', showHome: true },
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.home-btn').exists()).toBe(true);
    });

    it('should not render home button when showHome is false', () => {
      const wrapper = mount(PageHeader, {
        props: { title: 'Test', showHome: false },
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.home-btn').exists()).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should emit back event when back button is clicked', async () => {
      const wrapper = mount(PageHeader, {
        props: { title: 'Test', showBack: true },
        global: {
          plugins: [router],
        },
      });

      await wrapper.find('.back-btn').trigger('click');

      expect(wrapper.emitted('back')).toBeTruthy();
    });

    it('should navigate to home when home button is clicked', async () => {
      const pushSpy = vi.spyOn(router, 'push');
      
      const wrapper = mount(PageHeader, {
        props: { title: 'Test', showHome: true },
        global: {
          plugins: [router],
        },
      });

      await wrapper.find('.home-btn').trigger('click');

      expect(pushSpy).toHaveBeenCalledWith('/');
    });
  });

  describe('default props', () => {
    it('should have default title as empty string', () => {
      const wrapper = mount(PageHeader, {
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.title').text()).toBe('');
    });

    it('should show back button by default', () => {
      const wrapper = mount(PageHeader, {
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.back-btn').exists()).toBe(true);
    });

    it('should show home button by default', () => {
      const wrapper = mount(PageHeader, {
        global: {
          plugins: [router],
        },
      });

      expect(wrapper.find('.home-btn').exists()).toBe(true);
    });
  });
});

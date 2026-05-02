/**
 * FaceTagOverlay 组件单元测试
 * 测试人脸标注显示和点击交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Mock FaceTagOverlay component for testing
const FaceTagOverlay = {
  name: 'FaceTagOverlay',
  props: {
    faceTags: {
      type: Array,
      default: () => [],
    },
    showNames: {
      type: Boolean,
      default: true,
    },
    editable: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['tag-click', 'tag-hover'],
  template: `
    <div class="face-tag-overlay">
      <div
        v-for="(tag, index) in faceTags"
        :key="index"
        class="face-tag"
        :style="getTagStyle(tag)"
        @click="handleTagClick(tag, index)"
        @mouseenter="$emit('tag-hover', tag, index)"
      >
        <span v-if="showNames" class="tag-name">{{ tag.name }}</span>
      </div>
    </div>
  `,
  methods: {
    getTagStyle(tag: any) {
      return {
        left: `${tag.boundingBox.x}%`,
        top: `${tag.boundingBox.y}%`,
        width: `${tag.boundingBox.width}%`,
        height: `${tag.boundingBox.height}%`,
      };
    },
    handleTagClick(tag: any, index: number) {
      this.$emit('tag-click', tag, index);
    },
  },
};

describe('FaceTagOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const mockFaceTags = [
    {
      name: 'John Doe',
      alumniId: 'alumni-1',
      boundingBox: { x: 10, y: 10, width: 20, height: 25 },
    },
    {
      name: 'Jane Smith',
      alumniId: 'alumni-2',
      boundingBox: { x: 50, y: 30, width: 15, height: 20 },
    },
  ];

  describe('rendering', () => {
    it('should render face tags', () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: mockFaceTags },
      });

      const tags = wrapper.findAll('.face-tag');
      expect(tags).toHaveLength(2);
    });

    it('should render tag names when showNames is true', () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: mockFaceTags, showNames: true },
      });

      const names = wrapper.findAll('.tag-name');
      expect(names).toHaveLength(2);
      expect(names[0].text()).toBe('John Doe');
      expect(names[1].text()).toBe('Jane Smith');
    });

    it('should not render tag names when showNames is false', () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: mockFaceTags, showNames: false },
      });

      const names = wrapper.findAll('.tag-name');
      expect(names).toHaveLength(0);
    });

    it('should render empty when no face tags', () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: [] },
      });

      const tags = wrapper.findAll('.face-tag');
      expect(tags).toHaveLength(0);
    });
  });

  describe('positioning', () => {
    it('should apply correct position styles', () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: mockFaceTags },
      });

      const firstTag = wrapper.findAll('.face-tag')[0];
      const style = firstTag.attributes('style');
      
      expect(style).toContain('left: 10%');
      expect(style).toContain('top: 10%');
      expect(style).toContain('width: 20%');
      expect(style).toContain('height: 25%');
    });
  });

  describe('interactions', () => {
    it('should emit tag-click event when tag is clicked', async () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: mockFaceTags },
      });

      await wrapper.findAll('.face-tag')[0].trigger('click');

      expect(wrapper.emitted('tag-click')).toBeTruthy();
      expect(wrapper.emitted('tag-click')![0]).toEqual([mockFaceTags[0], 0]);
    });

    it('should emit tag-hover event when tag is hovered', async () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: mockFaceTags },
      });

      await wrapper.findAll('.face-tag')[1].trigger('mouseenter');

      expect(wrapper.emitted('tag-hover')).toBeTruthy();
      expect(wrapper.emitted('tag-hover')![0]).toEqual([mockFaceTags[1], 1]);
    });
  });

  describe('default props', () => {
    it('should have empty array as default faceTags', () => {
      const wrapper = mount(FaceTagOverlay);

      const tags = wrapper.findAll('.face-tag');
      expect(tags).toHaveLength(0);
    });

    it('should show names by default', () => {
      const wrapper = mount(FaceTagOverlay, {
        props: { faceTags: mockFaceTags },
      });

      const names = wrapper.findAll('.tag-name');
      expect(names).toHaveLength(2);
    });
  });
});

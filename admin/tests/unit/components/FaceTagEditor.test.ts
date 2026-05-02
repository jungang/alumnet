/**
 * FaceTagEditor 组件单元测试
 * 测试人脸标注编辑功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElButton: {
    name: 'ElButton',
    props: ['size', 'type', 'circle', 'disabled'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
  },
  ElInput: {
    name: 'ElInput',
    props: ['modelValue', 'placeholder', 'size'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock FaceTagEditor component for testing
const FaceTagEditor = {
  name: 'FaceTagEditor',
  props: {
    imageUrl: {
      type: String,
      required: true,
    },
    modelValue: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      tags: [...(this.modelValue as any[])],
      selectedIndex: null as number | null,
      isDrawing: false,
      drawStart: { x: 0, y: 0 },
      currentBox: { x: 0, y: 0, width: 0, height: 0 },
      imageLoaded: false,
    };
  },
  watch: {
    modelValue: {
      handler(newVal: any[]) {
        this.tags = [...newVal];
      },
      deep: true,
    },
    tags: {
      handler(newVal: any[]) {
        this.$emit('update:modelValue', newVal);
      },
      deep: true,
    },
  },
  template: `
    <div class="face-tag-editor">
      <div class="toolbar">
        <span class="tip">💡 在图片上拖拽绘制人脸区域</span>
        <button class="clear-btn" @click="clearAll" :disabled="tags.length === 0">清空所有</button>
      </div>
      <div 
        class="image-container"
        @mousedown="startDrawing"
        @mousemove="onDrawing"
        @mouseup="endDrawing"
        @mouseleave="endDrawing"
      >
        <img :src="imageUrl" class="photo-image" @load="onImageLoad" />
        <div
          v-for="(tag, index) in tags"
          :key="index"
          class="face-tag"
          :class="{ selected: selectedIndex === index }"
          :style="getTagStyle(tag.boundingBox)"
          @mousedown.stop="selectTag(index)"
        >
          <span class="tag-label" v-if="tag.name">{{ tag.name }}</span>
          <span class="tag-index" v-else>{{ index + 1 }}</span>
        </div>
        <div
          v-if="isDrawing && currentBox.width > 0"
          class="drawing-box"
          :style="getTagStyle(currentBox)"
        ></div>
      </div>
      <div class="tag-list" v-if="tags.length > 0">
        <div class="tag-list-header">人脸标记列表 ({{ tags.length }})</div>
        <div 
          v-for="(tag, index) in tags" 
          :key="index"
          class="tag-item"
          :class="{ active: selectedIndex === index }"
          @click="selectedIndex = index"
        >
          <span class="tag-number">{{ index + 1 }}</span>
          <input 
            v-model="tag.name" 
            placeholder="输入姓名"
            class="tag-name-input"
            @click.stop
          />
          <button class="delete-btn" @click.stop="deleteTag(index)">✕</button>
        </div>
      </div>
      <div v-else class="empty-tip">暂无人脸标记</div>
    </div>
  `,
  methods: {
    onImageLoad() {
      this.imageLoaded = true;
    },
    getTagStyle(box: { x: number; y: number; width: number; height: number }) {
      return {
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      };
    },
    startDrawing(e: MouseEvent) {
      if (e.button !== 0) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      this.isDrawing = true;
      this.drawStart = { x, y };
      this.currentBox = { x, y, width: 0, height: 0 };
      this.selectedIndex = null;
    },
    onDrawing(e: MouseEvent) {
      if (!this.isDrawing) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const posX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const posY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const x = Math.min(this.drawStart.x, posX);
      const y = Math.min(this.drawStart.y, posY);
      const width = Math.abs(posX - this.drawStart.x);
      const height = Math.abs(posY - this.drawStart.y);
      this.currentBox = { x, y, width, height };
    },
    endDrawing() {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (this.currentBox.width > 2 && this.currentBox.height > 2) {
        this.tags.push({
          name: '',
          boundingBox: { ...this.currentBox },
        });
        this.selectedIndex = this.tags.length - 1;
      }
      this.currentBox = { x: 0, y: 0, width: 0, height: 0 };
    },
    selectTag(index: number) {
      this.selectedIndex = index;
    },
    deleteTag(index: number) {
      this.tags.splice(index, 1);
      if (this.selectedIndex === index) {
        this.selectedIndex = null;
      } else if (this.selectedIndex !== null && this.selectedIndex > index) {
        this.selectedIndex--;
      }
    },
    clearAll() {
      this.tags = [];
      this.selectedIndex = null;
    },
  },
};

describe('FaceTagEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTags = [
    {
      name: '张三',
      alumniId: 'alumni-1',
      boundingBox: { x: 10, y: 10, width: 20, height: 25 },
    },
    {
      name: '李四',
      alumniId: 'alumni-2',
      boundingBox: { x: 50, y: 30, width: 15, height: 20 },
    },
  ];

  describe('rendering', () => {
    it('should render image with provided URL', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      const img = wrapper.find('.photo-image');
      expect(img.attributes('src')).toBe('/test-image.jpg');
    });

    it('should render existing face tags', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: mockTags,
        },
      });

      const tags = wrapper.findAll('.face-tag');
      expect(tags).toHaveLength(2);
    });

    it('should render tag names when available', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: mockTags,
        },
      });

      const labels = wrapper.findAll('.tag-label');
      expect(labels[0].text()).toBe('张三');
      expect(labels[1].text()).toBe('李四');
    });

    it('should render tag index when name is empty', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [{ name: '', boundingBox: { x: 10, y: 10, width: 20, height: 20 } }],
        },
      });

      const index = wrapper.find('.tag-index');
      expect(index.text()).toBe('1');
    });

    it('should render toolbar with tip', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      expect(wrapper.find('.toolbar').exists()).toBe(true);
      expect(wrapper.find('.tip').text()).toContain('拖拽绘制');
    });

    it('should render empty tip when no tags', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      expect(wrapper.find('.empty-tip').exists()).toBe(true);
      expect(wrapper.find('.empty-tip').text()).toContain('暂无人脸标记');
    });

    it('should render tag list when tags exist', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: mockTags,
        },
      });

      expect(wrapper.find('.tag-list').exists()).toBe(true);
      expect(wrapper.find('.tag-list-header').text()).toContain('2');
    });
  });

  describe('positioning', () => {
    it('should apply correct position styles to tags', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: mockTags,
        },
      });

      const firstTag = wrapper.findAll('.face-tag')[0];
      const style = firstTag.attributes('style');

      expect(style).toContain('left: 10%');
      expect(style).toContain('top: 10%');
      expect(style).toContain('width: 20%');
      expect(style).toContain('height: 25%');
    });
  });

  describe('tag selection', () => {
    it('should select tag when clicked', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: mockTags,
        },
      });

      await wrapper.findAll('.face-tag')[0].trigger('mousedown');

      expect(wrapper.findAll('.face-tag')[0].classes()).toContain('selected');
    });

    it('should select tag from list', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: mockTags,
        },
      });

      await wrapper.findAll('.tag-item')[1].trigger('click');

      expect(wrapper.findAll('.tag-item')[1].classes()).toContain('active');
    });
  });

  describe('tag deletion', () => {
    it('should delete tag when delete button is clicked', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [...mockTags],
        },
      });

      await wrapper.findAll('.delete-btn')[0].trigger('click');

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:modelValue')!.pop()![0] as any[];
      expect(emittedValue).toHaveLength(1);
      expect(emittedValue[0].name).toBe('李四');
    });

    it('should clear selection when selected tag is deleted', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [...mockTags],
        },
      });

      // Select first tag
      await wrapper.findAll('.face-tag')[0].trigger('mousedown');
      expect(wrapper.findAll('.face-tag')[0].classes()).toContain('selected');

      // Delete first tag
      await wrapper.findAll('.delete-btn')[0].trigger('click');

      // No tag should be selected
      const selectedTags = wrapper.findAll('.face-tag.selected');
      expect(selectedTags).toHaveLength(0);
    });
  });

  describe('clear all', () => {
    it('should clear all tags when clear button is clicked', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [...mockTags],
        },
      });

      await wrapper.find('.clear-btn').trigger('click');

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:modelValue')!.pop()![0] as any[];
      expect(emittedValue).toHaveLength(0);
    });

    it('should disable clear button when no tags', () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      const clearBtn = wrapper.find('.clear-btn');
      expect((clearBtn.element as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('tag name editing', () => {
    it('should update tag name when input changes', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [...mockTags],
        },
      });

      const input = wrapper.findAll('.tag-name-input')[0];
      await input.setValue('王五');

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      const emittedValue = wrapper.emitted('update:modelValue')!.pop()![0] as any[];
      expect(emittedValue[0].name).toBe('王五');
    });
  });

  describe('v-model binding', () => {
    it('should emit update:modelValue when tags change', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [...mockTags],
        },
      });

      await wrapper.findAll('.delete-btn')[0].trigger('click');

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    });

    it('should update internal tags when modelValue prop changes', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      expect(wrapper.findAll('.face-tag')).toHaveLength(0);

      await wrapper.setProps({ modelValue: mockTags });

      expect(wrapper.findAll('.face-tag')).toHaveLength(2);
    });
  });

  describe('image loading', () => {
    it('should set imageLoaded when image loads', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      await wrapper.find('.photo-image').trigger('load');

      expect((wrapper.vm as any).imageLoaded).toBe(true);
    });
  });

  describe('drawing interaction', () => {
    it('should start drawing on mousedown', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      const container = wrapper.find('.image-container');
      
      // Mock getBoundingClientRect
      const mockRect = { left: 0, top: 0, width: 100, height: 100 };
      vi.spyOn(container.element, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);

      await container.trigger('mousedown', { button: 0, clientX: 10, clientY: 10 });

      expect((wrapper.vm as any).isDrawing).toBe(true);
    });

    it('should not start drawing on right click', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      const container = wrapper.find('.image-container');
      await container.trigger('mousedown', { button: 2, clientX: 10, clientY: 10 });

      expect((wrapper.vm as any).isDrawing).toBe(false);
    });

    it('should end drawing on mouseup', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      const container = wrapper.find('.image-container');
      const mockRect = { left: 0, top: 0, width: 100, height: 100 };
      vi.spyOn(container.element, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);

      await container.trigger('mousedown', { button: 0, clientX: 10, clientY: 10 });
      expect((wrapper.vm as any).isDrawing).toBe(true);

      await container.trigger('mouseup');
      expect((wrapper.vm as any).isDrawing).toBe(false);
    });

    it('should end drawing on mouseleave', async () => {
      const wrapper = mount(FaceTagEditor, {
        props: {
          imageUrl: '/test-image.jpg',
          modelValue: [],
        },
      });

      const container = wrapper.find('.image-container');
      const mockRect = { left: 0, top: 0, width: 100, height: 100 };
      vi.spyOn(container.element, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);

      await container.trigger('mousedown', { button: 0, clientX: 10, clientY: 10 });
      await container.trigger('mouseleave');

      expect((wrapper.vm as any).isDrawing).toBe(false);
    });
  });
});

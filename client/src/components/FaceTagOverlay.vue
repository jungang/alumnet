<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

interface FaceTag {
  name: string;
  alumniId?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const props = defineProps<{
  tags: FaceTag[];
  showLabels?: boolean;
}>();

const router = useRouter();
const hoveredIndex = ref<number | null>(null);
const clickedIndex = ref<number | null>(null);

// 计算标记框样式
function getTagStyle(box: { x: number; y: number; width: number; height: number }) {
  return {
    left: `${box.x}%`,
    top: `${box.y}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  };
}

// 获取标签位置（显示在框的上方或下方）
function getLabelPosition(box: { x: number; y: number; width: number; height: number }) {
  // 如果框在图片上半部分，标签显示在下方
  if (box.y < 50) {
    return 'bottom';
  }
  return 'top';
}

// 点击标记
function handleTagClick(tag: FaceTag, index: number) {
  clickedIndex.value = clickedIndex.value === index ? null : index;
  
  // 如果有关联的校友ID，可以跳转到详情页
  if (tag.alumniId) {
    router.push(`/alumni/${tag.alumniId}`);
  }
}

// 鼠标进入
function handleMouseEnter(index: number) {
  hoveredIndex.value = index;
}

// 鼠标离开
function handleMouseLeave() {
  hoveredIndex.value = null;
}
</script>

<template>
  <div class="face-tag-overlay">
    <div
      v-for="(tag, index) in tags"
      :key="index"
      class="face-tag-box"
      :class="{ 
        'is-hovered': hoveredIndex === index,
        'is-clicked': clickedIndex === index,
        'has-alumni': !!tag.alumniId
      }"
      :style="getTagStyle(tag.boundingBox)"
      @mouseenter="handleMouseEnter(index)"
      @mouseleave="handleMouseLeave"
      @click="handleTagClick(tag, index)"
    >
      <!-- 标签 -->
      <transition name="fade">
        <div 
          v-if="tag.name && (showLabels || hoveredIndex === index || clickedIndex === index)"
          class="tag-label"
          :class="getLabelPosition(tag.boundingBox)"
        >
          <span class="name">{{ tag.name }}</span>
          <span v-if="tag.alumniId" class="link-hint">点击查看详情 →</span>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.face-tag-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.face-tag-box {
  position: absolute;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.3s ease;
}

.face-tag-box:hover,
.face-tag-box.is-hovered {
  border-color: rgba(20, 184, 166, 0.8);
  background: rgba(20, 184, 166, 0.1);
  box-shadow: 0 0 20px rgba(20, 184, 166, 0.3);
}

.face-tag-box.is-clicked {
  border-color: rgba(234, 179, 8, 0.8);
  background: rgba(234, 179, 8, 0.1);
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.3);
}

.face-tag-box.has-alumni {
  cursor: pointer;
}

.face-tag-box.has-alumni:hover {
  border-color: rgba(99, 102, 241, 0.8);
  background: rgba(99, 102, 241, 0.1);
}

.tag-label {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(20, 184, 166, 0.3);
  border-radius: 6px;
  white-space: nowrap;
  z-index: 10;
  text-align: center;
}

.tag-label.top {
  bottom: calc(100% + 8px);
}

.tag-label.bottom {
  top: calc(100% + 8px);
}

.tag-label .name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.tag-label .link-hint {
  display: block;
  font-size: 11px;
  color: rgba(20, 184, 166, 0.8);
  margin-top: 2px;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

.tag-label.top.fade-enter-from,
.tag-label.top.fade-leave-to {
  transform: translateX(-50%) translateY(-4px);
}
</style>

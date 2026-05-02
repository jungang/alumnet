<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { ElButton, ElInput, ElMessage } from 'element-plus';

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
  imageUrl: string;
  modelValue: FaceTag[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FaceTag[]): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const tags = ref<FaceTag[]>([...props.modelValue]);
const selectedIndex = ref<number | null>(null);
const isDrawing = ref(false);
const drawStart = ref({ x: 0, y: 0 });
const currentBox = ref({ x: 0, y: 0, width: 0, height: 0 });
const imageLoaded = ref(false);
const imageSize = ref({ width: 0, height: 0 });

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  tags.value = [...newVal];
}, { deep: true });

// 同步到外部
watch(tags, (newVal) => {
  emit('update:modelValue', newVal);
}, { deep: true });

// 图片加载完成
function onImageLoad() {
  if (imageRef.value) {
    imageSize.value = {
      width: imageRef.value.naturalWidth,
      height: imageRef.value.naturalHeight,
    };
    imageLoaded.value = true;
  }
}

// 获取鼠标在图片上的百分比位置
function getMousePosition(e: MouseEvent): { x: number; y: number } {
  if (!containerRef.value) return { x: 0, y: 0 };
  const rect = containerRef.value.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

// 开始绘制
function startDrawing(e: MouseEvent) {
  if (e.button !== 0) return; // 只响应左键
  const pos = getMousePosition(e);
  isDrawing.value = true;
  drawStart.value = pos;
  currentBox.value = { x: pos.x, y: pos.y, width: 0, height: 0 };
  selectedIndex.value = null;
}

// 绘制中
function onDrawing(e: MouseEvent) {
  if (!isDrawing.value) return;
  const pos = getMousePosition(e);
  const x = Math.min(drawStart.value.x, pos.x);
  const y = Math.min(drawStart.value.y, pos.y);
  const width = Math.abs(pos.x - drawStart.value.x);
  const height = Math.abs(pos.y - drawStart.value.y);
  currentBox.value = { x, y, width, height };
}

// 结束绘制
function endDrawing() {
  if (!isDrawing.value) return;
  isDrawing.value = false;
  
  // 只有足够大的框才添加
  if (currentBox.value.width > 2 && currentBox.value.height > 2) {
    const newTag: FaceTag = {
      name: '',
      boundingBox: { ...currentBox.value },
    };
    tags.value.push(newTag);
    selectedIndex.value = tags.value.length - 1;
  }
  currentBox.value = { x: 0, y: 0, width: 0, height: 0 };
}

// 选中标记
function selectTag(index: number, e: MouseEvent) {
  e.stopPropagation();
  selectedIndex.value = index;
}

// 删除标记
function deleteTag(index: number) {
  tags.value.splice(index, 1);
  if (selectedIndex.value === index) {
    selectedIndex.value = null;
  } else if (selectedIndex.value !== null && selectedIndex.value > index) {
    selectedIndex.value--;
  }
}

// 更新标记名称
function updateTagName(index: number, name: string) {
  if (tags.value[index]) {
    tags.value[index].name = name;
  }
}

// 清空所有标记
function clearAll() {
  tags.value = [];
  selectedIndex.value = null;
}

// 键盘事件
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' && selectedIndex.value !== null) {
    deleteTag(selectedIndex.value);
  } else if (e.key === 'Escape') {
    selectedIndex.value = null;
    if (isDrawing.value) {
      isDrawing.value = false;
      currentBox.value = { x: 0, y: 0, width: 0, height: 0 };
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});

// 计算标记框样式
function getTagStyle(box: { x: number; y: number; width: number; height: number }) {
  return {
    left: `${box.x}%`,
    top: `${box.y}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
  };
}
</script>

<template>
  <div class="face-tag-editor">
    <!-- 工具栏 -->
    <div class="toolbar">
      <span class="tip">💡 在图片上拖拽绘制人脸区域，点击选中后可编辑姓名</span>
      <ElButton size="small" type="danger" @click="clearAll" :disabled="tags.length === 0">
        清空所有
      </ElButton>
    </div>

    <!-- 图片容器 -->
    <div 
      ref="containerRef"
      class="image-container"
      @mousedown="startDrawing"
      @mousemove="onDrawing"
      @mouseup="endDrawing"
      @mouseleave="endDrawing"
    >
      <img 
        ref="imageRef"
        :src="imageUrl" 
        @load="onImageLoad"
        class="photo-image"
        draggable="false"
      />

      <!-- 已有标记 -->
      <div
        v-for="(tag, index) in tags"
        :key="index"
        class="face-tag"
        :class="{ selected: selectedIndex === index }"
        :style="getTagStyle(tag.boundingBox)"
        @mousedown.stop="selectTag(index, $event)"
      >
        <span class="tag-label" v-if="tag.name">{{ tag.name }}</span>
        <span class="tag-index" v-else>{{ index + 1 }}</span>
      </div>

      <!-- 正在绘制的框 -->
      <div
        v-if="isDrawing && currentBox.width > 0"
        class="drawing-box"
        :style="getTagStyle(currentBox)"
      ></div>
    </div>

    <!-- 标记列表 -->
    <div class="tag-list" v-if="tags.length > 0">
      <div class="tag-list-header">
        <span>人脸标记列表 ({{ tags.length }})</span>
      </div>
      <div 
        v-for="(tag, index) in tags" 
        :key="index"
        class="tag-item"
        :class="{ active: selectedIndex === index }"
        @click="selectedIndex = index"
      >
        <span class="tag-number">{{ index + 1 }}</span>
        <ElInput 
          v-model="tag.name" 
          placeholder="输入姓名"
          size="small"
          class="tag-name-input"
          @click.stop
        />
        <ElButton 
          type="danger" 
          size="small" 
          circle
          @click.stop="deleteTag(index)"
        >
          ✕
        </ElButton>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-tip">
      暂无人脸标记，请在图片上拖拽绘制
    </div>
  </div>
</template>

<style scoped>
.face-tag-editor {
  width: 100%;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.tip {
  font-size: 12px;
  color: #909399;
}

.image-container {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}

.photo-image {
  width: 100%;
  display: block;
  pointer-events: none;
}

.face-tag {
  position: absolute;
  border: 2px solid #409eff;
  background: rgba(64, 158, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.face-tag:hover {
  border-color: #67c23a;
  background: rgba(103, 194, 58, 0.2);
}

.face-tag.selected {
  border-color: #e6a23c;
  background: rgba(230, 162, 60, 0.2);
  border-width: 3px;
}

.tag-label, .tag-index {
  position: absolute;
  bottom: 100%;
  left: 0;
  padding: 2px 6px;
  background: #409eff;
  color: white;
  font-size: 12px;
  white-space: nowrap;
  border-radius: 2px 2px 0 0;
}

.face-tag.selected .tag-label,
.face-tag.selected .tag-index {
  background: #e6a23c;
}

.drawing-box {
  position: absolute;
  border: 2px dashed #67c23a;
  background: rgba(103, 194, 58, 0.2);
  pointer-events: none;
}

.tag-list {
  margin-top: 16px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.tag-list-header {
  padding: 8px 12px;
  background: #f5f7fa;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid #ebeef5;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background 0.2s;
}

.tag-item:last-child {
  border-bottom: none;
}

.tag-item:hover {
  background: #f5f7fa;
}

.tag-item.active {
  background: #ecf5ff;
}

.tag-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}

.tag-item.active .tag-number {
  background: #e6a23c;
}

.tag-name-input {
  flex: 1;
}

.empty-tip {
  margin-top: 16px;
  padding: 20px;
  text-align: center;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
}
</style>

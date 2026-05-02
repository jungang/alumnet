<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElMessage, ElTag } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const messages = ref<any[]>([]);

async function loadMessages() {
  loading.value = true;
  try {
    const res = await adminApi.getPendingMessages();
    if (res.data.success) {
      messages.value = res.data.data;
    }
  } catch (e) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleReview(id: string, status: 'approved' | 'rejected') {
  try {
    await adminApi.reviewMessage(id, status);
    ElMessage.success(status === 'approved' ? '已通过' : '已拒绝');
    loadMessages();
  } catch (e) {
    ElMessage.error('操作失败');
  }
}

onMounted(() => {
  loadMessages();
});
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">内容审核</span>
          <ElButton @click="loadMessages">刷新</ElButton>
        </div>
      </template>

      <ElTable :data="messages" v-loading="loading" stripe>
        <ElTableColumn prop="author_name" label="作者" width="120" />
        <ElTableColumn prop="author_class" label="班级" width="120" />
        <ElTableColumn prop="content" label="内容" min-width="300">
          <template #default="{ row }">
            <div class="max-h-20 overflow-auto">{{ row.content }}</div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="提交时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'danger'">
              {{ row.status === 'pending' ? '待审核' : row.status === 'approved' ? '已通过' : '已拒绝' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <ElButton type="success" size="small" @click="handleReview(row.id, 'approved')">通过</ElButton>
              <ElButton type="danger" size="small" @click="handleReview(row.id, 'rejected')">拒绝</ElButton>
            </template>
            <span v-else class="text-gray-400">已处理</span>
          </template>
        </ElTableColumn>
      </ElTable>

      <div v-if="!messages.length && !loading" class="text-center py-8 text-gray-400">
        暂无待审核内容
      </div>
    </ElCard>
  </div>
</template>

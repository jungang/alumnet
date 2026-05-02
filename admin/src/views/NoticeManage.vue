<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElPagination, ElMessage, ElMessageBox, ElSelect, ElOption, ElTag, ElInput } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterStatus = ref('');
const searchKeyword = ref('');

const statusOptions = [
  { value: 'active', label: '进行中', type: 'primary' },
  { value: 'found', label: '已找到', type: 'success' },
  { value: 'closed', label: '已关闭', type: 'info' },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getNoticeList({
      status: filterStatus.value,
      keyword: searchKeyword.value,
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    if (res.data.success) {
      tableData.value = res.data.data.items;
      total.value = res.data.data.total;
    }
  } catch (e) {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadData();
}

async function handleStatusChange(row: any, status: string) {
  try {
    await adminApi.updateNoticeStatus(row.id, status);
    ElMessage.success('状态更新成功');
    loadData();
  } catch (e) {
    ElMessage.error('更新失败');
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该寻人启事吗？', '提示', { type: 'warning' });
    await adminApi.deleteNotice(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {}
}

function getStatusType(status: string) {
  return statusOptions.find(s => s.value === status)?.type || 'info';
}

function getStatusLabel(status: string) {
  return statusOptions.find(s => s.value === status)?.label || status;
}

onMounted(() => loadData());
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">寻人启事管理</span>
          <div class="flex gap-4">
            <ElInput v-model="searchKeyword" placeholder="搜索姓名/描述" @keyup.enter="handleSearch" style="width: 200px" />
            <ElSelect v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px" @change="handleSearch">
              <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
          </div>
        </div>
      </template>

      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn prop="targetName" label="寻找对象" width="120" />
        <ElTableColumn prop="targetClass" label="班级" width="120" />
        <ElTableColumn prop="description" label="描述" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdAt" label="发布时间" width="180">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <ElSelect v-model="row.status" size="small" style="width: 100px" @change="(val: string) => handleStatusChange(row, val)">
              <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElButton type="danger" size="small" @click="handleDelete(row)" class="ml-2">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElPagination, ElSelect, ElOption, ElDatePicker, ElButton, ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const logs = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const filters = ref({
  operationType: '',
  dateRange: [] as Date[],
});

const operationTypes = [
  { value: '', label: '全部类型' },
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'delete', label: '删除' },
  { value: 'batch_import', label: '批量导入' },
  { value: 'review', label: '审核' },
];

async function loadLogs() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };
    
    if (filters.value.operationType) {
      params.operationType = filters.value.operationType;
    }
    
    if (filters.value.dateRange?.length === 2) {
      params.startDate = filters.value.dateRange[0].toISOString();
      params.endDate = filters.value.dateRange[1].toISOString();
    }

    const res = await adminApi.getLogs(params);
    if (res.data.success) {
      logs.value = res.data.data.items;
      total.value = res.data.data.total;
    }
  } catch (e) {
    ElMessage.error('加载日志失败');
  } finally {
    loading.value = false;
  }
}

function handleFilter() {
  currentPage.value = 1;
  loadLogs();
}

function resetFilters() {
  filters.value = {
    operationType: '',
    dateRange: [],
  };
  handleFilter();
}

function formatDetails(details: any): string {
  if (!details) return '-';
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

onMounted(() => {
  loadLogs();
});
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">系统日志</span>
        </div>
      </template>

      <!-- 筛选条件 -->
      <div class="flex gap-4 mb-4 flex-wrap">
        <ElSelect v-model="filters.operationType" placeholder="操作类型" style="width: 150px">
          <ElOption v-for="type in operationTypes" :key="type.value" :label="type.label" :value="type.value" />
        </ElSelect>
        <ElDatePicker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
        <ElButton type="primary" @click="handleFilter">筛选</ElButton>
        <ElButton @click="resetFilters">重置</ElButton>
      </div>

      <ElTable :data="logs" v-loading="loading" stripe>
        <ElTableColumn prop="operation_type" label="操作类型" width="120">
          <template #default="{ row }">
            <span :class="{
              'text-green-600': row.operation_type === 'create',
              'text-blue-600': row.operation_type === 'update',
              'text-red-600': row.operation_type === 'delete',
              'text-purple-600': row.operation_type === 'batch_import',
              'text-orange-600': row.operation_type === 'review',
            }">
              {{ row.operation_type }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="target_type" label="目标类型" width="100" />
        <ElTableColumn prop="target_id" label="目标ID" width="280">
          <template #default="{ row }">
            <span class="text-gray-500 text-xs">{{ row.target_id || '-' }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="details" label="详情" min-width="200">
          <template #default="{ row }">
            <div class="max-h-16 overflow-auto text-xs text-gray-600">
              {{ formatDetails(row.details) }}
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="created_at" label="时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </ElCard>
  </div>
</template>

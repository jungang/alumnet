<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElRow, ElCol, ElStatistic, ElDatePicker, ElButton, ElSelect, ElOption, ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const stats = ref<any>(null);
const trends = ref<any[]>([]);

// 日期范围
const dateRange = ref<[Date, Date]>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date(),
]);
const granularity = ref<'day' | 'week' | 'month'>('day');

// 导出
const exportType = ref<'messages' | 'notices' | 'videos'>('messages');
const exportDateRange = ref<[Date, Date]>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date(),
]);

async function loadStats() {
  loading.value = true;
  try {
    const res = await adminApi.getInteractionStats();
    if (res.data.success) {
      stats.value = res.data.data;
    }
  } catch (e) {
    ElMessage.error('加载统计数据失败');
  } finally {
    loading.value = false;
  }
}

async function loadTrends() {
  try {
    const res = await adminApi.getInteractionTrends({
      startDate: dateRange.value[0].toISOString(),
      endDate: dateRange.value[1].toISOString(),
      granularity: granularity.value,
    });
    if (res.data.success) {
      trends.value = res.data.data;
    }
  } catch (e) {
    ElMessage.error('加载趋势数据失败');
  }
}

async function handleExport() {
  try {
    const res = await adminApi.exportInteractionData(
      exportType.value,
      exportDateRange.value[0].toISOString(),
      exportDateRange.value[1].toISOString()
    );
    
    // 创建下载链接
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportType.value}_export_${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('导出成功');
  } catch (e) {
    ElMessage.error('导出失败');
  }
}

function formatSeconds(seconds: number): string {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
  return `${Math.round(seconds / 3600)}小时`;
}

const categoryLabels: Record<string, string> = {
  school: '写给母校',
  teacher: '写给恩师',
  classmate: '写给同学',
};

onMounted(() => {
  loadStats();
  loadTrends();
});
</script>

<template>
  <div class="space-y-6">
    <!-- 统计概览 -->
    <ElRow :gutter="20">
      <ElCol :span="8">
        <ElCard>
          <template #header>
            <span class="font-bold">💬 留言统计</span>
          </template>
          <div v-if="stats" class="space-y-4">
            <ElRow :gutter="16">
              <ElCol :span="12">
                <ElStatistic title="总留言数" :value="stats.messages.total" />
              </ElCol>
              <ElCol :span="12">
                <ElStatistic title="待审核" :value="stats.messages.pending" />
              </ElCol>
            </ElRow>
            <div class="border-t pt-4">
              <p class="text-sm text-gray-500 mb-2">分类分布</p>
              <div class="space-y-2">
                <div v-for="cat in stats.messages.byCategory" :key="cat.category" class="flex justify-between">
                  <span>{{ categoryLabels[cat.category] || cat.category }}</span>
                  <span class="font-semibold">{{ cat.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </ElCard>
      </ElCol>
      
      <ElCol :span="8">
        <ElCard>
          <template #header>
            <span class="font-bold">🔎 寻人启事统计</span>
          </template>
          <div v-if="stats" class="space-y-4">
            <ElRow :gutter="16">
              <ElCol :span="12">
                <ElStatistic title="总数" :value="stats.searchNotices.total" />
              </ElCol>
              <ElCol :span="12">
                <ElStatistic title="进行中" :value="stats.searchNotices.active" />
              </ElCol>
            </ElRow>
            <ElRow :gutter="16">
              <ElCol :span="12">
                <ElStatistic title="已找到" :value="stats.searchNotices.found" />
              </ElCol>
              <ElCol :span="12">
                <ElStatistic title="已关闭" :value="stats.searchNotices.closed" />
              </ElCol>
            </ElRow>
          </div>
        </ElCard>
      </ElCol>
      
      <ElCol :span="8">
        <ElCard>
          <template #header>
            <span class="font-bold">🎬 视频寄语统计</span>
          </template>
          <div v-if="stats" class="space-y-4">
            <ElRow :gutter="16">
              <ElCol :span="12">
                <ElStatistic title="总视频数" :value="stats.videoGreetings.total" />
              </ElCol>
              <ElCol :span="12">
                <ElStatistic title="待审核" :value="stats.videoGreetings.pending" />
              </ElCol>
            </ElRow>
            <ElRow :gutter="16">
              <ElCol :span="12">
                <ElStatistic title="精选视频" :value="stats.videoGreetings.featured" />
              </ElCol>
              <ElCol :span="12">
                <ElStatistic title="总观看" :value="stats.videoGreetings.totalViews" />
              </ElCol>
            </ElRow>
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- 审核效率 -->
    <ElCard v-if="stats">
      <template #header>
        <span class="font-bold">⏱️ 审核效率</span>
      </template>
      <ElRow :gutter="20">
        <ElCol :span="12">
          <div class="text-center">
            <p class="text-gray-500 mb-2">留言平均审核时间</p>
            <p class="text-2xl font-bold text-blue-600">{{ formatSeconds(stats.averageReviewTime.messages) }}</p>
          </div>
        </ElCol>
        <ElCol :span="12">
          <div class="text-center">
            <p class="text-gray-500 mb-2">视频平均审核时间</p>
            <p class="text-2xl font-bold text-green-600">{{ formatSeconds(stats.averageReviewTime.videos) }}</p>
          </div>
        </ElCol>
      </ElRow>
    </ElCard>

    <!-- 趋势图表 -->
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="font-bold">📈 提交趋势</span>
          <div class="flex gap-4">
            <ElDatePicker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="loadTrends"
            />
            <ElSelect v-model="granularity" style="width: 100px" @change="loadTrends">
              <ElOption label="按天" value="day" />
              <ElOption label="按周" value="week" />
              <ElOption label="按月" value="month" />
            </ElSelect>
          </div>
        </div>
      </template>
      <div class="h-64">
        <div v-if="trends.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2">日期</th>
                <th class="text-right py-2">留言</th>
                <th class="text-right py-2">寻人启事</th>
                <th class="text-right py-2">视频</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in trends" :key="item.date" class="border-b hover:bg-gray-50">
                <td class="py-2">{{ item.date }}</td>
                <td class="text-right py-2">{{ item.messages }}</td>
                <td class="text-right py-2">{{ item.notices }}</td>
                <td class="text-right py-2">{{ item.videos }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="flex items-center justify-center h-full text-gray-400">
          暂无数据
        </div>
      </div>
    </ElCard>

    <!-- 数据导出 -->
    <ElCard>
      <template #header>
        <span class="font-bold">📥 数据导出</span>
      </template>
      <div class="flex gap-4 items-center">
        <ElSelect v-model="exportType" style="width: 150px">
          <ElOption label="留言数据" value="messages" />
          <ElOption label="寻人启事" value="notices" />
          <ElOption label="视频寄语" value="videos" />
        </ElSelect>
        <ElDatePicker
          v-model="exportDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
        <ElButton type="primary" @click="handleExport">导出CSV</ElButton>
      </div>
    </ElCard>
  </div>
</template>


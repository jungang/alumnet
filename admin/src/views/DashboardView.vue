<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElRow, ElCol, ElStatistic, ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const stats = ref({
  totalAlumni: 0,
  totalDistinguished: 0,
  totalMessages: 0,
  pendingMessages: 0,
  totalDonations: 0,
  totalDonationAmount: 0,
});

async function loadStats() {
  loading.value = true;
  try {
    const res = await adminApi.getStatsOverview();
    if (res.data.success) {
      stats.value = res.data.data;
    }
  } catch (e) { ElMessage.error('加载统计数据失败'); }
  finally { loading.value = false; }
}

onMounted(() => loadStats());
</script>

<template>
  <div v-loading="loading">
    <ElRow :gutter="20">
      <ElCol :span="8">
        <ElCard shadow="hover">
          <ElStatistic title="校友总数" :value="stats.totalAlumni" />
        </ElCard>
      </ElCol>
      <ElCol :span="8">
        <ElCard shadow="hover">
          <ElStatistic title="杰出校友" :value="stats.totalDistinguished" />
        </ElCard>
      </ElCol>
      <ElCol :span="8">
        <ElCard shadow="hover">
          <ElStatistic title="留言总数" :value="stats.totalMessages" />
        </ElCard>
      </ElCol>
    </ElRow>
    <ElRow :gutter="20" class="mt-4">
      <ElCol :span="8">
        <ElCard shadow="hover">
          <ElStatistic title="待审核留言" :value="stats.pendingMessages" value-style="color: #E6A23C" />
        </ElCard>
      </ElCol>
      <ElCol :span="8">
        <ElCard shadow="hover">
          <ElStatistic title="捐赠笔数" :value="stats.totalDonations" />
        </ElCard>
      </ElCol>
      <ElCol :span="8">
        <ElCard shadow="hover">
          <ElStatistic title="捐赠总额" :value="stats.totalDonationAmount" :precision="2" prefix="¥" />
        </ElCard>
      </ElCol>
    </ElRow>
  </div>
</template>

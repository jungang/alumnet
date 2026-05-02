<script setup lang="ts">
import { ref } from 'vue';
import { ElCard, ElButton, ElTable, ElTableColumn, ElMessage, ElAlert, ElUpload } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const previewData = ref<any[]>([]);
const importResult = ref<any>(null);

function handleFileChange(file: any) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      // 简单的CSV解析
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      previewData.value = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, any> = {};
        headers.forEach((h, i) => {
          obj[h] = values[i];
        });
        return obj;
      });
      
      ElMessage.success(`已解析 ${previewData.value.length} 条数据`);
    } catch (e) {
      ElMessage.error('文件解析失败，请检查格式');
    }
  };
  reader.readAsText(file.raw);
  return false;
}

async function handleImport() {
  if (!previewData.value.length) {
    ElMessage.warning('请先上传数据文件');
    return;
  }

  loading.value = true;
  try {
    // 转换字段名
    const data = previewData.value.map(item => ({
      name: item['姓名'] || item.name,
      studentId: item['学号'] || item.studentId,
      graduationYear: parseInt(item['届别'] || item.graduationYear),
      className: item['班级'] || item.className,
      industry: item['行业'] || item.industry,
      currentCity: item['城市'] || item.currentCity,
      phone: item['电话'] || item.phone,
      email: item['邮箱'] || item.email,
    }));

    const res = await adminApi.importAlumni(data);
    if (res.data.success) {
      importResult.value = res.data.data;
      ElMessage.success('导入完成');
    }
  } catch (e) {
    ElMessage.error('导入失败');
  } finally {
    loading.value = false;
  }
}

function clearData() {
  previewData.value = [];
  importResult.value = null;
}
</script>

<template>
  <div class="space-y-4">
    <ElCard>
      <template #header>
        <span class="text-lg font-bold">数据导入</span>
      </template>

      <ElAlert type="info" :closable="false" class="mb-4">
        <template #title>
          支持CSV格式，表头可使用中文（姓名、学号、届别、班级、行业、城市、电话、邮箱）或英文字段名
        </template>
      </ElAlert>

      <div class="flex gap-4 mb-4">
        <ElUpload
          :auto-upload="false"
          :show-file-list="false"
          accept=".csv"
          :on-change="handleFileChange"
        >
          <ElButton type="primary">选择CSV文件</ElButton>
        </ElUpload>
        <ElButton type="success" :loading="loading" @click="handleImport" :disabled="!previewData.length">
          开始导入
        </ElButton>
        <ElButton @click="clearData" :disabled="!previewData.length">清空</ElButton>
      </div>

      <!-- 预览数据 -->
      <div v-if="previewData.length">
        <h3 class="font-bold mb-2">数据预览（前10条）</h3>
        <ElTable :data="previewData.slice(0, 10)" stripe max-height="300">
          <ElTableColumn v-for="key in Object.keys(previewData[0])" :key="key" :prop="key" :label="key" />
        </ElTable>
        <p class="text-gray-500 mt-2">共 {{ previewData.length }} 条数据</p>
      </div>
    </ElCard>

    <!-- 导入结果 -->
    <ElCard v-if="importResult">
      <template #header>
        <span class="text-lg font-bold">导入结果</span>
      </template>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="bg-green-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-green-600">{{ importResult.success }}</div>
          <div class="text-gray-500">成功</div>
        </div>
        <div class="bg-red-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-red-600">{{ importResult.failed }}</div>
          <div class="text-gray-500">失败</div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-yellow-600">{{ importResult.needReview?.length || 0 }}</div>
          <div class="text-gray-500">待核实</div>
        </div>
      </div>

      <div v-if="importResult.needReview?.length">
        <h3 class="font-bold mb-2">待核实数据</h3>
        <ElTable :data="importResult.needReview" stripe max-height="300">
          <ElTableColumn prop="name" label="姓名" />
          <ElTableColumn prop="graduationYear" label="届别" />
          <ElTableColumn prop="reason" label="原因" />
        </ElTable>
      </div>
    </ElCard>
  </div>
</template>

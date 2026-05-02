<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElForm, ElFormItem, ElInput, ElInputNumber, ElButton, ElMessage, ElDivider } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const configs = ref<Record<string, any>>({});

async function loadConfig() {
  loading.value = true;
  try {
    const res = await adminApi.getSystemConfig();
    if (res.data.success) {
      const configMap: Record<string, any> = {};
      res.data.data.forEach((item: any) => {
        configMap[item.config_key] = item.config_value;
      });
      configs.value = configMap;
    }
  } catch (e) { ElMessage.error('加载配置失败'); }
  finally { loading.value = false; }
}

async function saveConfig() {
  try {
    await adminApi.updateSystemConfig(configs.value);
    ElMessage.success('配置保存成功');
  } catch (e) { ElMessage.error('保存失败'); }
}

onMounted(() => loadConfig());
</script>

<template>
  <div>
    <ElCard v-loading="loading">
      <template #header><span class="text-lg font-bold">系统配置</span></template>
      <ElForm label-width="150px" style="max-width: 600px">
        <ElDivider content-position="left">基础设置</ElDivider>
        <ElFormItem label="系统标题">
          <ElInput v-model="configs.site_title" />
        </ElFormItem>
        <ElFormItem label="欢迎语">
          <ElInput v-model="configs.welcome_message" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="屏保超时(秒)">
          <ElInputNumber v-model="configs.screensaver_timeout" :min="60" :max="3600" />
        </ElFormItem>
        
        <ElDivider content-position="left">AI问答设置</ElDivider>
        <ElFormItem label="RAG检索数量">
          <ElInputNumber v-model="configs.rag_retrieval_count" :min="1" :max="20" />
        </ElFormItem>
        <ElFormItem label="回答最大长度">
          <ElInputNumber v-model="configs.rag_max_response_length" :min="100" :max="2000" />
        </ElFormItem>
        
        <ElFormItem>
          <ElButton type="primary" @click="saveConfig">保存配置</ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
</template>

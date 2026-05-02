<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElCard, ElForm, ElFormItem, ElInput, ElButton, ElMessage } from 'element-plus';
import { adminApi } from '@/api';

const router = useRouter();
const loading = ref(false);
const form = ref({
  username: '',
  password: '',
});

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }

  loading.value = true;
  try {
    const res = await adminApi.login(form.value.username, form.value.password);
    if (res.data.success) {
      localStorage.setItem('admin_token', res.data.data.token);
      ElMessage.success('登录成功');
      router.push('/');
    } else {
      ElMessage.error(res.data.message || '登录失败');
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <ElCard class="w-96">
      <template #header>
        <div class="text-center">
          <h1 class="text-xl font-bold">校友查询系统</h1>
          <p class="text-gray-500 text-sm mt-1">管理后台登录</p>
        </div>
      </template>

      <ElForm :model="form" @submit.prevent="handleLogin">
        <ElFormItem>
          <ElInput v-model="form.username" placeholder="用户名" size="large" />
        </ElFormItem>
        <ElFormItem>
          <ElInput v-model="form.password" type="password" placeholder="密码" size="large" show-password />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :loading="loading" @click="handleLogin" class="w-full" size="large">
            登录
          </ElButton>
        </ElFormItem>
      </ElForm>
    </ElCard>
  </div>
</template>

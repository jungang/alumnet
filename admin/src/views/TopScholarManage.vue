<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { UploadFile } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';

interface TopScholar {
  id: string;
  name: string;
  examYear: number;
  rankDescription: string;
  university?: string;
  major?: string;
  score?: number;
  photoUrl?: string;
  biography?: string;
  sortOrder: number;
}

const loading = ref(false);
const scholars = ref<TopScholar[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const dialogVisible = ref(false);
const dialogTitle = ref('');
const formData = ref<Partial<TopScholar>>({});
const isEdit = ref(false);

const uploadHeaders = ref<Record<string, string>>({});

function getAuthToken() {
  return localStorage.getItem('admin_token') || '';
}

function beforePhotoUpload(file: File) {
  const isImage = file.type.startsWith('image/');
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isImage) {
    ElMessage.error('只能上传图片文件');
    return false;
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB');
    return false;
  }
  return true;
}

function handlePhotoSuccess(response: any, uploadFile: UploadFile) {
  if (response?.success) {
    formData.value.photoUrl = response.data.url;
    ElMessage.success('上传成功');
  } else {
    ElMessage.error(response?.message || '上传失败');
    uploadFile.status = 'fail';
  }
}

function handlePhotoError() {
  ElMessage.error('上传失败，请重试');
}

function handlePhotoRemove() {
  formData.value.photoUrl = '';
}

const tableData = computed(() => scholars.value);

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getTopScholarList({
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    if (res.data.success) {
      scholars.value = res.data.data.items;
      total.value = res.data.data.total;
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '加载失败');
  }
  loading.value = false;
}

function handleSearch() {
  page.value = 1;
  loadData();
}

function handleAdd() {
  isEdit.value = false;
  dialogTitle.value = '新增状元';
  formData.value = {
    sortOrder: 0,
  };
  dialogVisible.value = true;
}

function handleEdit(row: TopScholar) {
  isEdit.value = true;
  dialogTitle.value = '编辑状元';
  formData.value = { ...row };
  dialogVisible.value = true;
}

async function handleDelete(row: TopScholar) {
  try {
    await ElMessageBox.confirm('确定要删除该状元记录吗？', '提示', {
      type: 'warning',
    });
    await adminApi.deleteTopScholar(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.response?.data?.message || '删除失败');
    }
  }
}

async function handleSubmit() {
  if (!formData.value.name || !formData.value.examYear || !formData.value.rankDescription || !formData.value.university) {
    ElMessage.warning('请填写必填字段');
    return;
  }

  loading.value = true;
  try {
    if (isEdit.value && formData.value.id) {
      await adminApi.updateTopScholar(formData.value.id, formData.value);
      ElMessage.success('更新成功');
    } else {
      await adminApi.createTopScholar(formData.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
  loading.value = false;
}

function handlePageChange(val: number) {
  page.value = val;
  loadData();
}

onMounted(() => {
  const token = getAuthToken();
  if (token) {
    uploadHeaders.value = {
      Authorization: `Bearer ${token}`,
    };
  }
  loadData();
});
</script>

<template>
  <div class="top-scholar-manage">
    <div class="header-actions">
      <div class="search-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索姓名、院校、排名描述"
          clearable
          @keyup.enter="handleSearch"
          style="width: 300px"
        >
          <template #append>
            <el-button icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>
      <el-button type="primary" icon="Plus" @click="handleAdd">新增状元</el-button>
    </div>

    <el-table
      :data="tableData"
      v-loading="loading"
      border
      stripe
      style="width: 100%; margin-top: 20px"
    >
      <el-table-column prop="examYear" label="年份" width="100" sortable />
      <el-table-column label="头像" width="90">
        <template #default="{ row }">
          <el-image
            v-if="row.photoUrl"
            :src="row.photoUrl"
            style="width: 50px; height: 50px; border-radius: 6px"
            fit="cover"
            :preview-src-list="[row.photoUrl]"
            preview-teleported
          />
          <div
            v-else
            style="width: 50px; height: 50px; border: 1px dashed var(--el-border-color); border-radius: 6px"
          />
        </template>
      </el-table-column>
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="rankDescription" label="排名描述" min-width="200" />
      <el-table-column prop="university" label="录取院校" min-width="150" />
      <el-table-column prop="major" label="专业" width="120" />
      <el-table-column prop="score" label="分数" width="100" />
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleEdit(row)">
            编辑
          </el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @current-change="handlePageChange"
      style="margin-top: 20px; justify-content: flex-end"
    />

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="姓名" required>
          <el-input v-model="formData.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="高考年份" required>
          <el-input-number
            v-model="formData.examYear"
            :min="1980"
            :max="2030"
            placeholder="请输入年份"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排名描述" required>
          <el-input
            v-model="formData.rankDescription"
            placeholder="如：吉林地区理科第一名"
          />
        </el-form-item>
        <el-form-item label="录取院校" required>
          <el-input v-model="formData.university" placeholder="请输入录取院校" />
        </el-form-item>
        <el-form-item label="专业">
          <el-input v-model="formData.major" placeholder="请输入专业" />
        </el-form-item>
        <el-form-item label="高考分数">
          <el-input-number
            v-model="formData.score"
            :min="0"
            :max="750"
            placeholder="请输入分数"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="照片URL">
          <el-upload
            :action="'/xyl/api/upload/photo'"
            :headers="uploadHeaders"
            :show-file-list="false"
            :before-upload="beforePhotoUpload"
            :on-success="handlePhotoSuccess"
            :on-error="handlePhotoError"
            :on-remove="handlePhotoRemove"
            accept="image/*"
          >
            <el-image
              v-if="formData.photoUrl"
              :src="formData.photoUrl"
              style="width: 120px; height: 120px; border-radius: 6px"
              fit="cover"
            />
            <div
              v-else
              style="width: 120px; height: 120px; border: 1px dashed var(--el-border-color); border-radius: 6px; display: flex; align-items: center; justify-content: center"
            >
              <el-icon size="28"><Plus /></el-icon>
            </div>
          </el-upload>
          <el-button
            v-if="formData.photoUrl"
            style="margin-left: 12px"
            @click="handlePhotoRemove"
          >
            移除
          </el-button>
          <el-input
            v-model="formData.photoUrl"
            placeholder="也可手动粘贴照片URL"
            style="margin-top: 10px"
          />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="formData.biography"
            type="textarea"
            :rows="4"
            placeholder="请输入简介"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="formData.sortOrder"
            :min="0"
            placeholder="数字越大越靠前"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.top-scholar-manage {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  display: flex;
  gap: 10px;
}
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  ElCard, ElTable, ElTableColumn, ElButton, ElInput, ElPagination,
  ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElSelect, ElOption,
  ElUpload, ElIcon
} from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const searchKeyword = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('新增校友');
const editingId = ref<string | null>(null);
const form = ref({
  name: '',
  studentId: '',
  graduationYear: new Date().getFullYear(),
  className: '',
  industry: '',
  currentCity: '',
  workUnit: '',
  phone: '',
  email: '',
  photoUrl: '',
});

const industries = ['政界', '商界', '学术', '艺术', '医疗', '教育', '科技', '其他'];

// 上传请求头
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

// 处理图片加载错误
function handleImageError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
  console.error('图片加载失败:', target.src);
}

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getAlumniList({
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

function handleAdd() {
  editingId.value = null;
  dialogTitle.value = '新增校友';
  form.value = {
    name: '',
    studentId: '',
    graduationYear: new Date().getFullYear(),
    className: '',
    industry: '',
    currentCity: '',
    workUnit: '',
    phone: '',
    email: '',
    photoUrl: '',
  };
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id;
  dialogTitle.value = '编辑校友';
  form.value = {
    name: row.name,
    studentId: row.studentId || '',
    graduationYear: row.graduationYear,
    className: row.className || '',
    industry: row.industry || '',
    currentCity: row.currentCity || '',
    workUnit: row.workUnit || '',
    phone: row.phone || '',
    email: row.email || '',
    photoUrl: row.photoUrl || '',
  };
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该校友吗？', '提示', { type: 'warning' });
    await adminApi.deleteAlumni(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {
    // 取消删除
  }
}

function handleAvatarSuccess(res: any) {
  if (res.success) {
    form.value.photoUrl = res.data.url;
    ElMessage.success('头像上传成功');
  } else {
    ElMessage.error(res.message || '上传失败');
  }
}

function beforeAvatarUpload(file: File) {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
  if (!isJpgOrPng) {
    ElMessage.error('只支持 JPG/PNG 格式的图片');
    return false;
  }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB');
    return false;
  }
  return true;
}

async function handleSubmit() {
  if (!form.value.name || !form.value.graduationYear) {
    ElMessage.warning('请填写必要信息');
    return;
  }

  try {
    if (editingId.value) {
      await adminApi.updateAlumni(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await adminApi.createAlumni(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error('操作失败');
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">校友管理</span>
          <div class="flex gap-4">
            <ElInput v-model="searchKeyword" placeholder="搜索姓名/学号" @keyup.enter="handleSearch" style="width: 200px" />
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton type="success" @click="handleAdd">新增校友</ElButton>
          </div>
        </div>
      </template>

      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="头像" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.photoUrl"
              :src="row.photoUrl"
              style="width: 50px; height: 50px; border-radius: 4px"
              fit="cover"
              :preview-src-list="[row.photoUrl]"
              preview-teleported
            />
            <span v-else class="text-gray-400 text-xs">无头像</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="姓名" width="100" />
        <ElTableColumn prop="studentId" label="学号" width="120" />
        <ElTableColumn prop="graduationYear" label="届别" width="80" />
        <ElTableColumn prop="className" label="班级" width="120" />
        <ElTableColumn prop="industry" label="行业" width="100" />
        <ElTableColumn prop="currentCity" label="所在城市" width="100" />
        <ElTableColumn prop="phone" label="电话" width="140" />
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" size="small" @click="handleEdit(row)">编辑</ElButton>
            <ElButton type="danger" size="small" @click="handleDelete(row)">删除</ElButton>
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
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </ElCard>

    <!-- 编辑对话框 -->
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <ElForm :model="form" label-width="80px">
        <ElFormItem label="姓名" required>
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="学号">
          <ElInput v-model="form.studentId" />
        </ElFormItem>
        <ElFormItem label="届别" required>
          <ElInput v-model.number="form.graduationYear" type="number" />
        </ElFormItem>
        <ElFormItem label="班级">
          <ElInput v-model="form.className" />
        </ElFormItem>
        <ElFormItem label="行业">
          <ElSelect v-model="form.industry" placeholder="选择行业" clearable>
            <ElOption v-for="ind in industries" :key="ind" :label="ind" :value="ind" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="所在城市">
          <ElInput v-model="form.currentCity" />
        </ElFormItem>
        <ElFormItem label="工作单位">
          <ElInput v-model="form.workUnit" />
        </ElFormItem>
        <ElFormItem label="电话">
          <ElInput v-model="form.phone" />
        </ElFormItem>
        <ElFormItem label="邮箱">
          <ElInput v-model="form.email" />
        </ElFormItem>
        <ElFormItem label="头像">
          <div class="avatar-uploader">
            <ElUpload
              class="avatar-uploader"
              :action="'/xyl/api/upload/photo'"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
              :before-upload="beforeAvatarUpload"
              :headers="uploadHeaders"
            >
              <el-image v-if="form.photoUrl" :src="form.photoUrl" class="avatar" fit="cover" />
              <ElIcon v-else class="avatar-uploader-icon"><Plus /></ElIcon>
            </ElUpload>
            <ElButton v-if="form.photoUrl" type="danger" link size="small" @click="form.photoUrl = ''">删除头像</ElButton>
          </div>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.avatar-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 100px;
  height: 100px;
  object-fit: cover;
  display: block;
}
</style>

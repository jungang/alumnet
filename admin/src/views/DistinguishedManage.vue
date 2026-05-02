<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  ElCard, ElTable, ElTableColumn, ElButton, ElInput, ElPagination,
  ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElSelect, ElOption,
  ElInputNumber, ElTag, ElUpload, ElImage
} from 'element-plus';
import type { UploadFile } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const searchKeyword = ref('');
const filterCategory = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('新增杰出校友');
const editingId = ref<string | null>(null);

// 校友选择
const alumniList = ref<any[]>([]);
const alumniLoading = ref(false);

const form = ref({
  alumniId: '',
  category: '',
  achievement: '',
  videoUrl: '',
  photoUrl: '',
  popularity: 0,
  timeline: [] as Array<{ year: number; title: string; description: string }>,
});

// 头像上传相关
const uploadHeaders = ref<Record<string, string>>({});

function getAuthToken() {
  return localStorage.getItem('admin_token') || '';
}

function handlePhotoSuccess(response: any, uploadFile: UploadFile) {
  if (response.success) {
    form.value.photoUrl = response.data.url;
    ElMessage.success('上传成功');
  } else {
    ElMessage.error(response.message || '上传失败');
    uploadFile.status = 'fail';
  }
}

function handlePhotoError() {
  ElMessage.error('上传失败，请重试');
}

function handlePhotoRemove() {
  form.value.photoUrl = '';
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

const categories = ['政界', '商界', '学术', '文化', '医疗', '教育', '科技', '体育', '革命烈士', '其他'];


async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getDistinguishedList({
      keyword: searchKeyword.value,
      category: filterCategory.value,
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

async function searchAlumni(keyword: string) {
  if (!keyword) return;
  alumniLoading.value = true;
  try {
    const res = await adminApi.getAlumniList({ keyword, pageSize: 20 });
    if (res.data.success) {
      alumniList.value = res.data.data.items;
    }
  } catch (e) {
    console.error('搜索校友失败', e);
  } finally {
    alumniLoading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadData();
}

function handleAdd() {
  editingId.value = null;
  dialogTitle.value = '新增杰出校友';
  form.value = {
    alumniId: '',
    category: '',
    achievement: '',
    videoUrl: '',
    photoUrl: '',
    popularity: 0,
    timeline: [],
  };
  alumniList.value = [];
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id;
  dialogTitle.value = '编辑杰出校友';
  form.value = {
    alumniId: row.alumniId,
    category: row.category || '',
    achievement: row.achievement || '',
    videoUrl: row.videoUrl || '',
    photoUrl: row.photoUrl || row.photo_url || '',
    popularity: row.popularity || 0,
    timeline: row.timeline || [],
  };
  // 设置当前校友到列表中
  alumniList.value = [{ id: row.alumniId, name: row.name, graduationYear: row.graduationYear }];
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该杰出校友吗？删除后基础校友信息将保留。', '提示', { type: 'warning' });
    await adminApi.deleteDistinguished(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {
    // 取消删除
  }
}

function addTimelineEvent() {
  form.value.timeline.push({ year: new Date().getFullYear(), title: '', description: '' });
}

function removeTimelineEvent(index: number) {
  form.value.timeline.splice(index, 1);
}


async function handleSubmit() {
  if (!editingId.value && !form.value.alumniId) {
    ElMessage.warning('请选择校友');
    return;
  }
  if (!form.value.category) {
    ElMessage.warning('请选择类别');
    return;
  }

  try {
    const submitData = {
      category: form.value.category,
      achievement: form.value.achievement,
      videoUrl: form.value.videoUrl,
      photoUrl: form.value.photoUrl,
      popularity: form.value.popularity,
      timeline: form.value.timeline,
    };
    if (editingId.value) {
      await adminApi.updateDistinguished(editingId.value, submitData);
      ElMessage.success('更新成功');
    } else {
      await adminApi.createDistinguished({ ...submitData, alumniId: form.value.alumniId });
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败');
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
          <span class="text-lg font-bold">杰出校友管理</span>
          <div class="flex gap-4">
            <ElInput v-model="searchKeyword" placeholder="搜索姓名/成就" @keyup.enter="handleSearch" style="width: 200px" />
            <ElSelect v-model="filterCategory" placeholder="选择类别" clearable style="width: 120px" @change="handleSearch">
              <ElOption v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
            </ElSelect>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton type="success" @click="handleAdd">新增杰出校友</ElButton>
          </div>
        </div>
      </template>

      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="头像" width="80">
          <template #default="{ row }">
            <el-image
              v-if="row.photoUrl || row.photo_url"
              :src="row.photoUrl || row.photo_url"
              style="width: 50px; height: 50px; border-radius: 4px"
              fit="cover"
              :preview-src-list="[row.photoUrl || row.photo_url]"
              preview-teleported
            />
            <span v-else class="text-gray-400 text-xs">无头像</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="姓名" width="100" />
        <ElTableColumn prop="graduationYear" label="届别" width="80" />
        <ElTableColumn prop="className" label="班级" width="120" />
        <ElTableColumn prop="category" label="类别" width="100">
          <template #default="{ row }">
            <ElTag>{{ row.category }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="achievement" label="成就" show-overflow-tooltip />
        <ElTableColumn prop="popularity" label="热度" width="80" />
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
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="700px">
      <ElForm :model="form" label-width="100px">
        <ElFormItem label="选择校友" required v-if="!editingId">
          <ElSelect
            v-model="form.alumniId"
            filterable
            remote
            :remote-method="searchAlumni"
            :loading="alumniLoading"
            placeholder="输入姓名搜索校友"
            style="width: 100%"
          >
            <ElOption
              v-for="alumni in alumniList"
              :key="alumni.id"
              :label="`${alumni.name} (${alumni.graduationYear}届)`"
              :value="alumni.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="类别" required>
          <ElSelect v-model="form.category" placeholder="选择类别">
            <ElOption v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="成就描述">
          <ElInput v-model="form.achievement" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="头像照片">
          <div class="flex items-center gap-4">
            <ElUpload
              class="avatar-uploader"
              action="/xyl/api/upload/photo"
              :headers="{ Authorization: `Bearer ${getAuthToken()}` }"
              :show-file-list="false"
              :on-success="handlePhotoSuccess"
              :on-error="handlePhotoError"
              :on-remove="handlePhotoRemove"
              :before-upload="beforePhotoUpload"
            >
              <el-image v-if="form.photoUrl" :src="form.photoUrl" class="avatar" fit="cover" />
              <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            </ElUpload>
            <span class="text-gray-500 text-sm">点击上传头像，支持jpg、png格式，不超过5MB</span>
          </div>
        </ElFormItem>
        <ElFormItem label="视频链接">
          <ElInput v-model="form.videoUrl" placeholder="视频URL" />
        </ElFormItem>
        <ElFormItem label="热度排序">
          <ElInputNumber v-model="form.popularity" :min="0" :max="9999" />
        </ElFormItem>
        <ElFormItem label="时间线">
          <div class="w-full">
            <div v-for="(event, index) in form.timeline" :key="index" class="mb-2 p-2 border rounded">
              <div class="flex gap-2 mb-2">
                <ElInputNumber v-model="event.year" :min="1900" :max="2100" placeholder="年份" />
                <ElInput v-model="event.title" placeholder="标题" style="flex: 1" />
                <ElButton type="danger" size="small" @click="removeTimelineEvent(index)">删除</ElButton>
              </div>
              <ElInput v-model="event.description" type="textarea" :rows="2" placeholder="描述" />
            </div>
            <ElButton type="primary" size="small" @click="addTimelineEvent">添加时间线事件</ElButton>
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
.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.avatar-uploader .el-upload:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 100px;
  height: 100px;
  display: block;
  object-fit: cover;
  border-radius: 4px;
}
</style>

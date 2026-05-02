<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  ElCard, ElTable, ElTableColumn, ElButton, ElPagination,
  ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElSelect, ElOption,
  ElInputNumber, ElImage, ElInput, ElUpload, ElProgress
} from 'element-plus';
import type { UploadFile, UploadFiles } from 'element-plus';
import { adminApi } from '@/api';
import FaceTagEditor from '@/components/FaceTagEditor.vue';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterYear = ref<number | undefined>();
const filterClassName = ref('');

const yearOptions = ref<number[]>([]);
const classOptions = ref<string[]>([]);

const dialogVisible = ref(false);
const dialogTitle = ref('新增毕业照');
const editingId = ref<string | null>(null);

const form = ref({
  year: new Date().getFullYear(),
  className: '',
  originalUrl: '',
  restoredUrl: '',
});

// 人脸标记对话框
const tagDialogVisible = ref(false);
const currentPhoto = ref<any>(null);
const faceTags = ref<any[]>([]);

// 图片预览对话框
const previewVisible = ref(false);
const previewUrl = ref('');

// 批量上传
const batchUploadVisible = ref(false);
const uploadFileList = ref<UploadFile[]>([]);
const uploadProgress = ref(0);
const isUploading = ref(false);
const batchUploadYear = ref(new Date().getFullYear());
const batchUploadClass = ref('');

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getPhotoList({
      year: filterYear.value,
      className: filterClassName.value,
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

async function loadOptions() {
  try {
    const res = await adminApi.getPhotoOptions();
    if (res.data.success) {
      yearOptions.value = res.data.data.years;
      classOptions.value = res.data.data.classes;
    }
  } catch (e) {
    console.error('加载选项失败', e);
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadData();
}

function handleAdd() {
  editingId.value = null;
  dialogTitle.value = '新增毕业照';
  form.value = {
    year: new Date().getFullYear(),
    className: '',
    originalUrl: '',
    restoredUrl: '',
  };
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id;
  dialogTitle.value = '编辑毕业照';
  form.value = {
    year: row.year,
    className: row.className || row.class_name || '',
    originalUrl: row.originalUrl || row.original_url || '',
    restoredUrl: row.restoredUrl || row.restored_url || '',
  };
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该毕业照吗？', '提示', { type: 'warning' });
    await adminApi.deletePhoto(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {
    // 取消删除
  }
}

function handleTagEdit(row: any) {
  currentPhoto.value = row;
  faceTags.value = [...(row.faceTags || row.face_tags || [])];
  tagDialogVisible.value = true;
}

async function saveFaceTags() {
  try {
    await adminApi.updatePhotoTags(currentPhoto.value.id, faceTags.value);
    ElMessage.success('保存成功');
    tagDialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error('保存失败');
  }
}

async function handleSubmit() {
  if (!form.value.year || !form.value.originalUrl) {
    ElMessage.warning('请填写年份和图片URL');
    return;
  }

  try {
    if (editingId.value) {
      await adminApi.updatePhoto(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await adminApi.createPhoto(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
    loadOptions();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

// 批量上传相关
function openBatchUpload() {
  uploadFileList.value = [];
  uploadProgress.value = 0;
  isUploading.value = false;
  batchUploadYear.value = new Date().getFullYear();
  batchUploadClass.value = '';
  batchUploadVisible.value = true;
}

function handleUploadChange(file: UploadFile, fileList: UploadFiles) {
  uploadFileList.value = fileList;
}

function handleUploadRemove(file: UploadFile) {
  const index = uploadFileList.value.findIndex(f => f.uid === file.uid);
  if (index > -1) {
    uploadFileList.value.splice(index, 1);
  }
}

async function startBatchUpload() {
  if (uploadFileList.value.length === 0) {
    ElMessage.warning('请选择要上传的照片');
    return;
  }

  if (!batchUploadYear.value) {
    ElMessage.warning('请选择年份');
    return;
  }

  const token = localStorage.getItem('admin_token');
  if (!token) {
    ElMessage.error('请先登录');
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  const total = uploadFileList.value.length;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < uploadFileList.value.length; i++) {
    const file = uploadFileList.value[i];
    try {
      const formData = new FormData();
      formData.append('file', file.raw as File);
      formData.append('category', 'photos');
      
      const uploadRes = await fetch('/xyl/api/upload/photo', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!uploadRes.ok) {
        throw new Error(`上传失败: ${uploadRes.status}`);
      }
      
      const uploadData = await uploadRes.json();

      if (uploadData.success && uploadData.data?.url) {
        await adminApi.createPhoto({
          year: batchUploadYear.value,
          className: batchUploadClass.value,
          originalUrl: uploadData.data.url,
        });
        success++;
      } else {
        failed++;
        console.error('上传失败:', uploadData);
      }
    } catch (e: any) {
      console.error('上传失败:', e);
      failed++;
    }
    uploadProgress.value = Math.round(((i + 1) / total) * 100);
  }

  isUploading.value = false;
  
  if (success > 0) {
    ElMessage.success(`上传完成：成功 ${success} 张${failed > 0 ? `，失败 ${failed} 张` : ''}`);
    batchUploadVisible.value = false;
    loadData();
    loadOptions();
  } else {
    ElMessage.error(`上传失败：${failed} 张全部失败，请检查网络或联系管理员`);
  }
}

// 单张图片上传
async function handleSingleUpload(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'photos');
    
    const token = localStorage.getItem('admin_token');
    if (!token) {
      ElMessage.error('请先登录');
      return;
    }
    
    // 使用与其他 API 一致的路径
    const res = await fetch('/xyl/api/upload/photo', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `上传失败: ${res.status}`);
    }
    
    const data = await res.json();

    if (data.success && data.data?.url) {
      form.value.originalUrl = data.data.url;
      ElMessage.success('图片上传成功');
    } else {
      ElMessage.error(data.message || '上传失败');
    }
  } catch (e: any) {
    console.error('上传错误:', e);
    ElMessage.error(e.message || '上传失败，请检查网络连接');
  }
}

function beforeUpload(file: File) {
  const isImage = file.type.startsWith('image/');
  const isLt10M = file.size / 1024 / 1024 < 10;

  if (!isImage) {
    ElMessage.error('只能上传图片文件');
    return false;
  }
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB');
    return false;
  }
  
  handleSingleUpload(file);
  return false; // 阻止默认上传
}

// 获取图片完整URL
function getPhotoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  // 后端返回的路径如 /uploads/photos/xxx.jpg，直接使用即可，Nginx 已配置 /uploads 映射
  return url;
}

// 预览图片
function handlePreview(url: string) {
  if (!url) return;
  previewUrl.value = getPhotoUrl(url);
  previewVisible.value = true;
}

onMounted(() => {
  loadData();
  loadOptions();
});
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">毕业照管理</span>
          <div class="flex gap-4">
            <ElSelect v-model="filterYear" placeholder="选择年份" clearable style="width: 120px" @change="handleSearch">
              <ElOption v-for="year in yearOptions" :key="year" :label="`${year}届`" :value="year" />
            </ElSelect>
            <ElSelect v-model="filterClassName" placeholder="选择班级" clearable style="width: 150px" @change="handleSearch">
              <ElOption v-for="cls in classOptions" :key="cls" :label="cls" :value="cls" />
            </ElSelect>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton type="warning" @click="openBatchUpload">批量上传</ElButton>
            <ElButton type="success" @click="handleAdd">新增毕业照</ElButton>
          </div>
        </div>
      </template>

      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="照片" width="120">
          <template #default="{ row }">
            <div class="cursor-pointer" @click="handlePreview(row.originalUrl || row.original_url)">
              <ElImage 
                :src="getPhotoUrl(row.originalUrl || row.original_url)" 
                style="width: 80px; height: 60px" 
                fit="cover"
                :preview-src-list="[getPhotoUrl(row.originalUrl || row.original_url)]"
                preview-teleported
              >
                <template #error>
                  <div class="flex items-center justify-center w-full h-full bg-gray-200 text-gray-400 text-xs">
                    <span>无照片</span>
                  </div>
                </template>
                <template #placeholder>
                  <div class="flex items-center justify-center w-full h-full bg-gray-100">
                    <span class="text-gray-300 text-xs">加载中...</span>
                  </div>
                </template>
              </ElImage>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="year" label="年份" width="80">
          <template #default="{ row }">{{ row.year }}届</template>
        </ElTableColumn>
        <ElTableColumn label="班级" width="150">
          <template #default="{ row }">{{ row.className || row.class_name || '-' }}</template>
        </ElTableColumn>
        <ElTableColumn label="人脸标记" width="100">
          <template #default="{ row }">{{ (row.faceTags || row.face_tags)?.length || 0 }}人</template>
        </ElTableColumn>
        <ElTableColumn label="图片URL" show-overflow-tooltip>
          <template #default="{ row }">{{ row.originalUrl || row.original_url }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton type="info" size="small" @click="handleTagEdit(row)">标记</ElButton>
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
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <ElForm :model="form" label-width="80px">
        <ElFormItem label="年份" required>
          <ElInputNumber v-model="form.year" :min="1900" :max="2100" />
        </ElFormItem>
        <ElFormItem label="班级">
          <ElInput v-model="form.className" placeholder="班级名称" />
        </ElFormItem>
        <ElFormItem label="图片" required>
          <div class="w-full">
            <ElUpload
              :show-file-list="false"
              :before-upload="beforeUpload"
              accept="image/*"
            >
              <ElButton type="primary" size="small">上传图片</ElButton>
            </ElUpload>
            <ElInput v-model="form.originalUrl" placeholder="或直接输入图片URL" class="mt-2" />
            <div v-if="form.originalUrl" class="mt-2">
              <ElImage 
                :src="getPhotoUrl(form.originalUrl)" 
                style="max-width: 200px; max-height: 150px" 
                fit="contain"
                :preview-src-list="[getPhotoUrl(form.originalUrl)]"
              >
                <template #error>
                  <div class="flex items-center justify-center w-[200px] h-[150px] bg-gray-200 text-gray-400">
                    <span>图片加载失败</span>
                  </div>
                </template>
              </ElImage>
            </div>
          </div>
        </ElFormItem>
        <ElFormItem label="修复图URL">
          <ElInput v-model="form.restoredUrl" placeholder="修复后图片URL（可选）" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 人脸标记对话框 -->
    <ElDialog v-model="tagDialogVisible" title="人脸标记编辑" width="900px" top="5vh">
      <div v-if="currentPhoto">
        <FaceTagEditor 
          :image-url="getPhotoUrl(currentPhoto.originalUrl || currentPhoto.original_url)"
          v-model="faceTags"
        />
      </div>
      <template #footer>
        <ElButton @click="tagDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveFaceTags">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 图片预览对话框 -->
    <ElDialog v-model="previewVisible" title="查看原图" width="90%" top="5vh" :fullscreen="false">
      <div class="flex justify-center items-center" style="min-height: 60vh;">
        <img :src="previewUrl" style="max-width: 100%; max-height: 80vh; object-fit: contain;" />
      </div>
      <template #footer>
        <ElButton @click="previewVisible = false">关闭</ElButton>
        <ElButton type="primary" @click="window.open(previewUrl, '_blank')">在新窗口打开</ElButton>
      </template>
    </ElDialog>

    <!-- 批量上传对话框 -->
    <ElDialog v-model="batchUploadVisible" title="批量上传毕业照" width="600px">
      <ElForm label-width="80px">
        <ElFormItem label="年份" required>
          <ElInputNumber v-model="batchUploadYear" :min="1900" :max="2100" />
        </ElFormItem>
        <ElFormItem label="班级">
          <ElInput v-model="batchUploadClass" placeholder="班级名称（可选，所有照片使用相同班级）" />
        </ElFormItem>
        <ElFormItem label="选择照片">
          <ElUpload
            v-model:file-list="uploadFileList"
            :auto-upload="false"
            :on-change="handleUploadChange"
            :on-remove="handleUploadRemove"
            accept="image/*"
            multiple
            list-type="picture-card"
          >
            <div class="flex flex-col items-center justify-center">
              <span class="text-2xl">+</span>
              <span class="text-xs">选择图片</span>
            </div>
          </ElUpload>
        </ElFormItem>
        <ElFormItem v-if="isUploading">
          <ElProgress :percentage="uploadProgress" :stroke-width="20" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="batchUploadVisible = false" :disabled="isUploading">取消</ElButton>
        <ElButton type="primary" @click="startBatchUpload" :loading="isUploading">
          {{ isUploading ? '上传中...' : `开始上传 (${uploadFileList.length}张)` }}
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

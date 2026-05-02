<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElPagination, ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElSelect, ElOption, ElTag, ElInput, ElDatePicker, ElUpload, ElIcon } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterType = ref('');
const filterStatus = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('发布校友动态');
const editingId = ref<string | null>(null);
const form = ref({ title: '', content: '', alumniName: '', newsType: 'news', publishDate: '', status: 'published', coverImage: '' });

// 上传请求头
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

const typeOptions = [
  { value: 'award', label: '获奖' },
  { value: 'donation', label: '捐赠' },
  { value: 'activity', label: '活动' },
  { value: 'news', label: '新闻' },
];
const statusOptions = [
  { value: 'draft', label: '草稿', type: 'info' },
  { value: 'published', label: '已发布', type: 'success' },
  { value: 'archived', label: '已归档', type: 'warning' },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getNewsList({ newsType: filterType.value, status: filterStatus.value, page: currentPage.value, pageSize: pageSize.value });
    if (res.data.success) { tableData.value = res.data.data.items; total.value = res.data.data.total; }
  } catch (e) { ElMessage.error('加载数据失败'); }
  finally { loading.value = false; }
}

function handleAdd() {
  editingId.value = null; dialogTitle.value = '发布校友动态';
  form.value = { title: '', content: '', alumniName: '', newsType: 'news', publishDate: '', status: 'published', coverImage: '' };
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id; dialogTitle.value = '编辑校友动态';
  form.value = { title: row.title, content: row.content || '', alumniName: row.alumniName || '', newsType: row.newsType || 'news', publishDate: row.publishDate || '', status: row.status, coverImage: row.coverImage || '' };
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该动态吗？', '提示', { type: 'warning' });
    await adminApi.deleteNews(row.id);
    ElMessage.success('删除成功'); loadData();
  } catch (e) {}
}

async function handleSubmit() {
  if (!form.value.title) { ElMessage.warning('请填写标题'); return; }
  try {
    if (editingId.value) { await adminApi.updateNews(editingId.value, form.value); ElMessage.success('更新成功'); }
    else { await adminApi.createNews(form.value); ElMessage.success('发布成功'); }
    dialogVisible.value = false; loadData();
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败'); }
}

function handleCoverSuccess(res: any) {
  if (res.success) { form.value.coverImage = res.data.url; ElMessage.success('封面上传成功'); }
  else { ElMessage.error(res.message || '上传失败'); }
}

function beforeCoverUpload(file: File) {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) { ElMessage.error('只支持 JPG/PNG 格式'); return false; }
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) { ElMessage.error('图片大小不能超过 5MB'); return false; }
  return true;
}

function getTypeLabel(type: string) { return typeOptions.find(t => t.value === type)?.label || type; }
function getStatusType(status: string) { return statusOptions.find(s => s.value === status)?.type || 'info'; }
function getStatusLabel(status: string) { return statusOptions.find(s => s.value === status)?.label || status; }

onMounted(() => loadData());
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">校友动态管理</span>
          <div class="flex gap-4">
            <ElSelect v-model="filterType" placeholder="类型筛选" clearable style="width: 100px" @change="loadData">
              <ElOption v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElSelect v-model="filterStatus" placeholder="状态筛选" clearable style="width: 100px" @change="loadData">
              <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElButton type="success" @click="handleAdd">发布动态</ElButton>
          </div>
        </div>
      </template>
      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="封面" width="100">
          <template #default="{ row }">
            <el-image v-if="row.coverImage" :src="row.coverImage" style="width: 80px; height: 50px; border-radius: 4px;" fit="cover" :preview-src-list="[row.coverImage]" preview-teleported />
            <span v-else class="text-gray-400 text-xs">无封面</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" show-overflow-tooltip />
        <ElTableColumn prop="alumniName" label="关联校友" width="100" />
        <ElTableColumn prop="newsType" label="类型" width="80">
          <template #default="{ row }">{{ getTypeLabel(row.newsType) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }"><ElTag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</ElTag></template>
        </ElTableColumn>
        <ElTableColumn prop="publishDate" label="发布日期" width="120" />
        <ElTableColumn label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <ElButton type="primary" size="small" @click="handleEdit(row)">编辑</ElButton>
            <ElButton type="danger" size="small" @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-4 flex justify-end">
        <ElPagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="loadData" @current-change="loadData" />
      </div>
    </ElCard>
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <ElForm :model="form" label-width="100px">
        <ElFormItem label="标题" required><ElInput v-model="form.title" /></ElFormItem>
        <ElFormItem label="关联校友"><ElInput v-model="form.alumniName" placeholder="校友姓名" /></ElFormItem>
        <ElFormItem label="类型">
          <ElSelect v-model="form.newsType"><ElOption v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" /></ElSelect>
        </ElFormItem>
        <ElFormItem label="发布日期"><ElDatePicker v-model="form.publishDate" type="date" value-format="YYYY-MM-DD" /></ElFormItem>
        <ElFormItem label="状态">
          <ElSelect v-model="form.status"><ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" /></ElSelect>
        </ElFormItem>
        <ElFormItem label="封面图片">
          <div class="cover-uploader">
            <ElUpload
              class="cover-uploader-single"
              :action="'/xyl/api/upload/photo'"
              :show-file-list="false"
              :on-success="handleCoverSuccess"
              :before-upload="beforeCoverUpload"
              :headers="uploadHeaders"
            >
              <el-image v-if="form.coverImage" :src="form.coverImage" class="cover-image" fit="cover" />
              <div v-else class="cover-placeholder">
                <ElIcon :size="28"><Plus /></ElIcon>
                <div class="cover-text">点击上传封面</div>
              </div>
            </ElUpload>
            <ElButton v-if="form.coverImage" type="danger" link size="small" @click="form.coverImage = ''">删除封面</ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="内容"><ElInput v-model="form.content" type="textarea" :rows="5" /></ElFormItem>
      </ElForm>
      <template #footer><ElButton @click="dialogVisible = false">取消</ElButton><ElButton type="primary" @click="handleSubmit">确定</ElButton></template>
    </ElDialog>
  </div>
</template>

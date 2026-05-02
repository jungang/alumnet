<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElPagination, ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElSelect, ElOption, ElTag, ElInput, ElInputNumber, ElProgress, ElUpload, ElIcon } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterStatus = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('新增捐赠项目');
const editingId = ref<string | null>(null);
const form = ref({ name: '', description: '', targetAmount: 10000, status: 'active', coverImage: '' });

// 上传请求头
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

const statusOptions = [
  { value: 'active', label: '进行中', type: 'primary' },
  { value: 'completed', label: '已完成', type: 'success' },
  { value: 'closed', label: '已关闭', type: 'info' },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getDonationProjectList({ status: filterStatus.value, page: currentPage.value, pageSize: pageSize.value });
    if (res.data.success) { tableData.value = res.data.data.items; total.value = res.data.data.total; }
  } catch (e) { ElMessage.error('加载数据失败'); }
  finally { loading.value = false; }
}

function handleAdd() {
  editingId.value = null; dialogTitle.value = '新增捐赠项目';
  form.value = { name: '', description: '', targetAmount: 10000, status: 'active', coverImage: '' };
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id; dialogTitle.value = '编辑捐赠项目';
  form.value = { name: row.name, description: row.description || '', targetAmount: row.targetAmount, status: row.status, coverImage: row.coverImage || '' };
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该捐赠项目吗？', '提示', { type: 'warning' });
    await adminApi.deleteDonationProject(row.id);
    ElMessage.success('删除成功'); loadData();
  } catch (e) {}
}

async function handleSubmit() {
  if (!form.value.name || !form.value.targetAmount) { ElMessage.warning('请填写项目名称和目标金额'); return; }
  try {
    if (editingId.value) { await adminApi.updateDonationProject(editingId.value, form.value); ElMessage.success('更新成功'); }
    else { await adminApi.createDonationProject(form.value); ElMessage.success('创建成功'); }
    dialogVisible.value = false; loadData();
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败'); }
}

function handleCoverSuccess(res: any) {
  if (res.success) { form.value.coverImage = res.url; ElMessage.success('封面上传成功'); }
  else { ElMessage.error(res.message || '上传失败'); }
}

function beforeCoverUpload(file: File) {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) { ElMessage.error('只支持 JPG/PNG 格式'); return false; }
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) { ElMessage.error('图片大小不能超过 5MB'); return false; }
  return true;
}

function getProgress(row: any) { return Math.min(100, Math.round((row.currentAmount / row.targetAmount) * 100)); }
function getStatusType(status: string) { return statusOptions.find(s => s.value === status)?.type || 'info'; }
function getStatusLabel(status: string) { return statusOptions.find(s => s.value === status)?.label || status; }

onMounted(() => loadData());
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">捐赠项目管理</span>
          <div class="flex gap-4">
            <ElSelect v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px" @change="loadData">
              <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElButton type="success" @click="handleAdd">新增项目</ElButton>
          </div>
        </div>
      </template>
      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="封面" width="100">
          <template #default="{ row }">
            <img v-if="row.coverImage" :src="`/xyl${row.coverImage}`" style="width: 80px; height: 50px; object-fit: cover; border-radius: 4px;" />
            <span v-else class="text-gray-400 text-xs">无封面</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="项目名称" width="200" />
        <ElTableColumn prop="description" label="描述" show-overflow-tooltip />
        <ElTableColumn label="进度" width="200">
          <template #default="{ row }">
            <ElProgress :percentage="getProgress(row)" :format="() => `${row.currentAmount}/${row.targetAmount}`" />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }"><ElTag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</ElTag></template>
        </ElTableColumn>
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
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <ElForm :model="form" label-width="100px">
        <ElFormItem label="项目名称" required><ElInput v-model="form.name" /></ElFormItem>
        <ElFormItem label="描述"><ElInput v-model="form.description" type="textarea" :rows="3" /></ElFormItem>
        <ElFormItem label="目标金额" required><ElInputNumber v-model="form.targetAmount" :min="1" :step="1000" /></ElFormItem>
        <ElFormItem label="封面图片">
          <div class="cover-uploader">
            <ElUpload
              class="cover-uploader-single"
              :action="'/xyl/api/upload'"
              :show-file-list="false"
              :on-success="handleCoverSuccess"
              :before-upload="beforeCoverUpload"
              :headers="uploadHeaders"
            >
              <img v-if="form.coverImage" :src="`/xyl${form.coverImage}`" class="cover-image" />
              <div v-else class="cover-placeholder">
                <ElIcon :size="28"><Plus /></ElIcon>
                <div class="cover-text">点击上传封面</div>
              </div>
            </ElUpload>
            <ElButton v-if="form.coverImage" type="danger" link size="small" @click="form.coverImage = ''">删除封面</ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="状态" v-if="editingId">
          <ElSelect v-model="form.status"><ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" /></ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer><ElButton @click="dialogVisible = false">取消</ElButton><ElButton type="primary" @click="handleSubmit">确定</ElButton></template>
    </ElDialog>
  </div>
</template>

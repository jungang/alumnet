<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElPagination, ElDialog, ElMessage, ElMessageBox, ElSelect, ElOption, ElTag, ElInput, ElCheckbox, ElDatePicker } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterStatus = ref('');
const filterCategory = ref('');
const dateRange = ref<[Date, Date] | null>(null);
const searchKeyword = ref('');
const selectedIds = ref<string[]>([]);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejectingId = ref('');

const detailDialogVisible = ref(false);
const currentMessage = ref<any>(null);

const statusOptions = [
  { value: 'pending', label: '待审核', type: 'warning' },
  { value: 'approved', label: '已通过', type: 'success' },
  { value: 'rejected', label: '已拒绝', type: 'danger' },
];

const categoryOptions = [
  { value: 'school', label: '致母校' },
  { value: 'teacher', label: '致恩师' },
  { value: 'classmate', label: '致同学' },
];

async function loadData() {
  loading.value = true;
  try {
    const params: any = { 
      status: filterStatus.value, 
      category: filterCategory.value,
      keyword: searchKeyword.value, 
      page: currentPage.value, 
      pageSize: pageSize.value 
    };
    if (dateRange.value) {
      params.startDate = dateRange.value[0].toISOString();
      params.endDate = dateRange.value[1].toISOString();
    }
    const res = await adminApi.getMessageList(params);
    if (res.data.success) { tableData.value = res.data.data.items; total.value = res.data.data.total; }
  } catch (e) { ElMessage.error('加载数据失败'); }
  finally { loading.value = false; selectedIds.value = []; }
}

function handleSearch() { currentPage.value = 1; loadData(); }

function handleSelectionChange(selection: any[]) { selectedIds.value = selection.map(s => s.id); }

async function handleViewDetail(row: any) {
  try {
    const res = await adminApi.getMessageById(row.id);
    if (res.data.success) { currentMessage.value = res.data.data; detailDialogVisible.value = true; }
  } catch (e) { ElMessage.error('获取详情失败'); }
}

async function handleStatusChange(row: any, status: string) {
  if (status === 'rejected') {
    rejectingId.value = row.id;
    rejectReason.value = '';
    rejectDialogVisible.value = true;
    return;
  }
  try {
    await adminApi.updateMessageStatus(row.id, status);
    ElMessage.success('状态更新成功'); loadData();
  } catch (e) { ElMessage.error('更新失败'); }
}

async function confirmReject() {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因');
    return;
  }
  try {
    await adminApi.updateMessageStatus(rejectingId.value, 'rejected', rejectReason.value);
    ElMessage.success('已拒绝'); 
    rejectDialogVisible.value = false;
    loadData();
  } catch (e) { ElMessage.error('操作失败'); }
}

async function handleBatchReview(status: 'approved' | 'rejected') {
  if (selectedIds.value.length === 0) { ElMessage.warning('请选择要审核的留言'); return; }
  try {
    await ElMessageBox.confirm(`确定要批量${status === 'approved' ? '通过' : '拒绝'}选中的${selectedIds.value.length}条留言吗？`, '提示');
    await adminApi.batchReviewMessages(selectedIds.value, status);
    ElMessage.success('批量审核成功'); loadData();
  } catch (e) {}
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该留言吗？', '提示', { type: 'warning' });
    await adminApi.deleteMessage(row.id);
    ElMessage.success('删除成功'); loadData();
  } catch (e) {}
}

function getStatusType(status: string) { return statusOptions.find(s => s.value === status)?.type || 'info'; }
function getStatusLabel(status: string) { return statusOptions.find(s => s.value === status)?.label || status; }
function getCategoryLabel(category: string) { return categoryOptions.find(c => c.value === category)?.label || category; }

onMounted(() => loadData());
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <span class="text-lg font-bold">留言管理</span>
            <div class="flex gap-2">
              <ElButton type="success" @click="handleBatchReview('approved')" :disabled="selectedIds.length === 0">批量通过</ElButton>
              <ElButton type="danger" @click="handleBatchReview('rejected')" :disabled="selectedIds.length === 0">批量拒绝</ElButton>
            </div>
          </div>
          <div class="flex gap-3 flex-wrap">
            <ElInput v-model="searchKeyword" placeholder="搜索内容/作者" @keyup.enter="handleSearch" style="width: 180px" />
            <ElSelect v-model="filterStatus" placeholder="状态" clearable style="width: 100px" @change="handleSearch">
              <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElSelect v-model="filterCategory" placeholder="分类" clearable style="width: 100px" @change="handleSearch">
              <ElOption v-for="opt in categoryOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElDatePicker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px" @change="handleSearch" />
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
          </div>
        </div>
      </template>
      <ElTable :data="tableData" v-loading="loading" stripe @selection-change="handleSelectionChange">
        <ElTableColumn type="selection" width="50" />
        <ElTableColumn prop="authorName" label="作者" width="100" />
        <ElTableColumn prop="authorClass" label="班级" width="120" />
        <ElTableColumn prop="category" label="分类" width="80">
          <template #default="{ row }">{{ getCategoryLabel(row.category) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="content" label="内容" show-overflow-tooltip />
        <ElTableColumn prop="status" label="状态" width="90">
          <template #default="{ row }"><ElTag :type="getStatusType(row.status)" size="small">{{ getStatusLabel(row.status) }}</ElTag></template>
        </ElTableColumn>
        <ElTableColumn prop="createdAt" label="时间" width="160">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <ElButton type="info" size="small" @click="handleViewDetail(row)">详情</ElButton>
            <ElSelect v-model="row.status" size="small" style="width: 90px" @change="(val: string) => handleStatusChange(row, val)">
              <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElButton type="danger" size="small" @click="handleDelete(row)" class="ml-2">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="mt-4 flex justify-end">
        <ElPagination v-model:current-page="currentPage" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @size-change="loadData" @current-change="loadData" />
      </div>
    </ElCard>
    <ElDialog v-model="detailDialogVisible" title="留言详情" width="600px">
      <div v-if="currentMessage" class="space-y-4">
        <div><strong>作者：</strong>{{ currentMessage.authorName }} ({{ currentMessage.authorClass }})</div>
        <div><strong>分类：</strong>{{ getCategoryLabel(currentMessage.category) }}</div>
        <div><strong>内容：</strong><p class="whitespace-pre-wrap">{{ currentMessage.content }}</p></div>
        <div v-if="currentMessage.handwritingImageUrl"><strong>手写图片：</strong><img :src="currentMessage.handwritingImageUrl" class="max-w-full mt-2" /></div>
        <div><strong>状态：</strong><ElTag :type="getStatusType(currentMessage.status)">{{ getStatusLabel(currentMessage.status) }}</ElTag></div>
        <div v-if="currentMessage.rejectionReason"><strong>拒绝原因：</strong>{{ currentMessage.rejectionReason }}</div>
        <div><strong>时间：</strong>{{ new Date(currentMessage.createdAt).toLocaleString() }}</div>
      </div>
    </ElDialog>
    <ElDialog v-model="rejectDialogVisible" title="拒绝留言" width="400px">
      <ElInput v-model="rejectReason" type="textarea" :rows="3" placeholder="请输入拒绝原因（必填）" />
      <template #footer>
        <ElButton @click="rejectDialogVisible = false">取消</ElButton>
        <ElButton type="danger" @click="confirmReject">确认拒绝</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElPagination, ElDialog, ElMessage, ElMessageBox, ElSelect, ElOption, ElTag, ElInput, ElImage } from 'element-plus';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterStatus = ref('');
const searchKeyword = ref('');

const detailDialogVisible = ref(false);
const currentVideo = ref<any>(null);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejectingId = ref('');

const statusOptions = [
  { value: 'pending', label: '待审核', type: 'warning' },
  { value: 'approved', label: '已通过', type: 'success' },
  { value: 'rejected', label: '已拒绝', type: 'danger' },
  { value: 'featured', label: '精选', type: '' },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getVideoGreetingList({
      status: filterStatus.value,
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

async function handleViewDetail(row: any) {
  try {
    const res = await adminApi.getVideoGreetingById(row.id);
    if (res.data.success) {
      currentVideo.value = res.data.data;
      detailDialogVisible.value = true;
    }
  } catch (e) {
    ElMessage.error('获取详情失败');
  }
}

async function handleApprove(row: any) {
  try {
    await adminApi.updateVideoStatus(row.id, 'approved');
    ElMessage.success('审核通过');
    loadData();
  } catch (e) {
    ElMessage.error('操作失败');
  }
}

function showRejectDialog(row: any) {
  rejectingId.value = row.id;
  rejectReason.value = '';
  rejectDialogVisible.value = true;
}

async function handleReject() {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写拒绝原因');
    return;
  }
  try {
    await adminApi.updateVideoStatus(rejectingId.value, 'rejected', rejectReason.value);
    ElMessage.success('已拒绝');
    rejectDialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error('操作失败');
  }
}

async function handleToggleFeatured(row: any) {
  const isFeatured = row.status === 'featured';
  try {
    await adminApi.setVideoFeatured(row.id, !isFeatured);
    ElMessage.success(isFeatured ? '已取消精选' : '已设为精选');
    loadData();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该视频吗？', '提示', { type: 'warning' });
    await adminApi.deleteVideoGreeting(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {}
}

function getStatusType(status: string) {
  return statusOptions.find(s => s.value === status)?.type || 'info';
}

function getStatusLabel(status: string) {
  return statusOptions.find(s => s.value === status)?.label || status;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

onMounted(() => loadData());
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">视频寄语管理</span>
          <div class="flex gap-4">
            <ElInput v-model="searchKeyword" placeholder="搜索标题/校友" @keyup.enter="handleSearch" style="width: 200px" />
            <ElSelect v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px" @change="handleSearch">
              <ElOption v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </ElSelect>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
          </div>
        </div>
      </template>

      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="缩略图" width="120">
          <template #default="{ row }">
            <ElImage 
              v-if="row.thumbnailUrl" 
              :src="row.thumbnailUrl" 
              fit="cover" 
              style="width: 80px; height: 45px; border-radius: 4px;"
              :preview-src-list="[row.thumbnailUrl]"
            />
            <span v-else class="text-gray-400">无缩略图</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="title" label="标题" show-overflow-tooltip />
        <ElTableColumn prop="alumniName" label="校友" width="100" />
        <ElTableColumn prop="alumniClass" label="班级" width="120" />
        <ElTableColumn label="时长" width="80">
          <template #default="{ row }">{{ formatDuration(row.durationSeconds) }}</template>
        </ElTableColumn>
        <ElTableColumn prop="viewCount" label="观看" width="80" />
        <ElTableColumn prop="status" label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="createdAt" label="上传时间" width="160">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString() }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <ElButton type="info" size="small" @click="handleViewDetail(row)">详情</ElButton>
            <ElButton 
              v-if="row.status === 'pending'" 
              type="success" 
              size="small" 
              @click="handleApprove(row)"
            >通过</ElButton>
            <ElButton 
              v-if="row.status === 'pending'" 
              type="warning" 
              size="small" 
              @click="showRejectDialog(row)"
            >拒绝</ElButton>
            <ElButton 
              v-if="row.status === 'approved' || row.status === 'featured'" 
              :type="row.status === 'featured' ? 'info' : 'primary'" 
              size="small" 
              @click="handleToggleFeatured(row)"
            >{{ row.status === 'featured' ? '取消精选' : '设为精选' }}</ElButton>
            <ElButton type="danger" size="small" @click="handleDelete(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>

      <div class="mt-4 flex justify-end">
        <ElPagination 
          v-model:current-page="currentPage" 
          v-model:page-size="pageSize" 
          :total="total"
          :page-sizes="[10, 20, 50]" 
          layout="total, sizes, prev, pager, next"
          @size-change="loadData" 
          @current-change="loadData" 
        />
      </div>
    </ElCard>

    <!-- 详情弹窗 -->
    <ElDialog v-model="detailDialogVisible" title="视频详情" width="700px">
      <div v-if="currentVideo" class="space-y-4">
        <div class="aspect-video bg-black rounded-lg overflow-hidden">
          <video :src="currentVideo.videoUrl" controls class="w-full h-full"></video>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><strong>标题：</strong>{{ currentVideo.title }}</div>
          <div><strong>校友：</strong>{{ currentVideo.alumniName }}</div>
          <div><strong>班级：</strong>{{ currentVideo.alumniClass || '-' }}</div>
          <div><strong>时长：</strong>{{ formatDuration(currentVideo.durationSeconds) }}</div>
          <div><strong>观看次数：</strong>{{ currentVideo.viewCount }}</div>
          <div><strong>状态：</strong><ElTag :type="getStatusType(currentVideo.status)">{{ getStatusLabel(currentVideo.status) }}</ElTag></div>
        </div>
        <div v-if="currentVideo.description">
          <strong>描述：</strong>
          <p class="mt-1 text-gray-600">{{ currentVideo.description }}</p>
        </div>
        <div v-if="currentVideo.rejectionReason">
          <strong>拒绝原因：</strong>
          <p class="mt-1 text-red-500">{{ currentVideo.rejectionReason }}</p>
        </div>
        <div><strong>上传时间：</strong>{{ new Date(currentVideo.createdAt).toLocaleString() }}</div>
      </div>
    </ElDialog>

    <!-- 拒绝原因弹窗 -->
    <ElDialog v-model="rejectDialogVisible" title="拒绝视频" width="400px">
      <ElInput 
        v-model="rejectReason" 
        type="textarea" 
        :rows="3" 
        placeholder="请填写拒绝原因..."
      />
      <template #footer>
        <ElButton @click="rejectDialogVisible = false">取消</ElButton>
        <ElButton type="danger" @click="handleReject">确认拒绝</ElButton>
      </template>
    </ElDialog>
  </div>
</template>


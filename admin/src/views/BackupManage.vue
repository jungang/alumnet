<template>
  <div class="backup-manage">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span class="title">数据备份与恢复</span>
          <el-button type="primary" @click="showCreateDialog" :loading="creating">
            <el-icon><Plus /></el-icon>
            创建备份
          </el-button>
        </div>
      </template>

      <!-- 备份文件列表 -->
      <el-table :data="backups" v-loading="loading" stripe>
        <el-table-column prop="filename" label="备份文件名" min-width="200" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="文件大小" width="120">
          <template #default="{ row }">
            {{ formatSize(row.size) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="downloadBackup(row.filename)">
                <el-icon><Download /></el-icon>
                下载
              </el-button>
              <el-button size="small" type="warning" @click="restoreBackup(row.filename)">
                <el-icon><RefreshLeft /></el-icon>
                恢复
              </el-button>
              <el-button size="small" type="danger" @click="deleteBackup(row.filename)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 上传备份区域 -->
      <el-divider>上传备份文件</el-divider>
      <el-upload
        class="upload-demo"
        action="/xyl/api/backup/upload"
        :headers="uploadHeaders"
        :on-success="handleUploadSuccess"
        :on-error="handleUploadError"
        :before-upload="beforeUpload"
        :show-file-list="false"
        accept=".tar.gz"
        drag
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只能上传 .tar.gz 格式的备份文件，最大支持 10GB
          </div>
        </template>
      </el-upload>
    </el-card>

    <!-- 创建备份对话框 -->
    <el-dialog v-model="createDialogVisible" title="创建备份" width="500px">
      <el-form :model="createForm" label-width="120px">
        <el-form-item label="备份说明">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入备份说明（可选）"
          />
        </el-form-item>
        <el-form-item label="备份数据库">
          <el-switch v-model="createForm.includeDatabase" />
        </el-form-item>
        <el-form-item label="备份上传文件">
          <el-switch v-model="createForm.includeFiles" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createBackup" :loading="creating">
          开始备份
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Download,
  RefreshLeft,
  Delete,
  UploadFilled,
} from '@element-plus/icons-vue';
import api from '@/api';

interface Backup {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
  dbSize: number;
  fileSize: number;
  description?: string;
}

const backups = ref<Backup[]>([]);
const loading = ref(false);
const creating = ref(false);
const createDialogVisible = ref(false);

const createForm = ref({
  description: '',
  includeDatabase: true,
  includeFiles: true,
});

const uploadHeaders = ref({
  Authorization: `Bearer ${localStorage.getItem('admin_token') || ''}`,
});

// 加载备份列表
const loadBackups = async () => {
  loading.value = true;
  try {
    const response = await api.get('/backup/list');
    backups.value = response.data.data || [];
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '加载备份列表失败');
  } finally {
    loading.value = false;
  }
};

// 显示创建对话框
const showCreateDialog = () => {
  createForm.value = {
    description: '',
    includeDatabase: true,
    includeFiles: true,
  };
  createDialogVisible.value = true;
};

// 创建备份
const createBackup = async () => {
  creating.value = true;
  try {
    const response = await api.post('/backup/create', createForm.value);
    ElMessage.success('备份创建成功');
    createDialogVisible.value = false;
    await loadBackups();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '创建备份失败');
  } finally {
    creating.value = false;
  }
};

// 下载备份
const downloadBackup = (filename: string) => {
  const token = localStorage.getItem('admin_token');
  const url = `/xyl/api/backup/download/${filename}?token=${token}`;
  window.open(url, '_blank');
  ElMessage.success('开始下载备份文件');
};

// 恢复备份
const restoreBackup = async (filename: string) => {
  try {
    await ElMessageBox.confirm(
      '恢复备份将覆盖当前数据库和文件，此操作不可撤销！是否继续？',
      '确认恢复',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await api.post(`/backup/restore/${filename}`);
    ElMessage.success('备份恢复成功，系统将重新加载');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '恢复备份失败');
    }
  }
};

// 删除备份
const deleteBackup = async (filename: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除此备份文件吗？此操作不可撤销！',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    await api.delete(`/backup/${filename}`);
    ElMessage.success('备份删除成功');
    await loadBackups();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除备份失败');
    }
  }
};

// 上传前验证
const beforeUpload = (file: File) => {
  if (!file.name.endsWith('.tar.gz')) {
    ElMessage.error('只能上传 .tar.gz 格式的备份文件');
    return false;
  }
  if (file.size > 10 * 1024 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10GB');
    return false;
  }
  return true;
};

// 上传成功
const handleUploadSuccess = (response: any) => {
  if (response.success) {
    ElMessage.success('备份上传成功');
    loadBackups();
  } else {
    ElMessage.error(response.message || '上传失败');
  }
};

// 上传失败
const handleUploadError = (error: any) => {
  ElMessage.error('上传失败：' + (error.message || '未知错误'));
};

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

onMounted(() => {
  loadBackups();
});
</script>

<style scoped>
.backup-manage {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.upload-demo {
  margin-top: 20px;
}

.el-icon--upload {
  font-size: 67px;
  color: var(--el-text-color-secondary);
  margin: 20px 0;
}

.el-upload__text {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.el-upload__text em {
  color: var(--el-color-primary);
  font-style: normal;
}

.el-upload__tip {
  margin-top: 7px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>

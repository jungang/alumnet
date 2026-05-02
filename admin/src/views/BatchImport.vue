<script setup lang="ts">
import { ref } from 'vue';
import { 
  ElCard, ElButton, ElTable, ElTableColumn, ElMessage, ElAlert, 
  ElUpload, ElProgress, ElTag, ElSteps, ElStep, ElResult, ElIcon
} from 'element-plus';
import { Download, Upload, Check, Document, CircleCheck } from '@element-plus/icons-vue';
import { adminApi } from '@/api';
import * as XLSX from 'xlsx';

const activeStep = ref(0);
const loading = ref(false);
const previewData = ref<any[]>([]);
const importResult = ref<any>(null);
const uploadProgress = ref(0);
const fileName = ref('');
const fileType = ref<'excel' | 'csv' | ''>('');
const validationErrors = ref<string[]>([]);

// 字段映射（支持中文和英文表头）
const fieldMapping: Record<string, string> = {
  '姓名': 'name', 'name': 'name',
  '学号': 'studentId', 'studentId': 'studentId', 'student_id': 'studentId',
  '届别': 'graduationYear', 'graduationYear': 'graduationYear', 'graduation_year': 'graduationYear',
  '班级': 'className', 'className': 'className', 'class_name': 'className',
  '专业': 'major', 'major': 'major',
  '行业': 'industry', 'industry': 'industry',
  '城市': 'currentCity', '所在城市': 'currentCity', 'currentCity': 'currentCity', 'current_city': 'currentCity',
  '工作单位': 'workUnit', 'workUnit': 'workUnit', 'work_unit': 'workUnit',
  '电话': 'phone', '手机': 'phone', 'phone': 'phone',
  '邮箱': 'email', '电子邮件': 'email', 'email': 'email',
  '头像URL': 'photoUrl', 'photoUrl': 'photoUrl', 'photo_url': 'photoUrl', '照片': 'photoUrl',
};

// 必填字段
const requiredFields = ['name', 'graduationYear'];

// 下载模板
function downloadTemplate() {
  const headers = ['姓名*', '学号', '届别*', '班级', '专业', '行业', '城市', '工作单位', '电话', '邮箱', '头像URL'];
  const description = ['必填', '选填', '必填，数字年份如2024', '选填', '选填', '选填', '选填', '选填', '选填', '选填', '选填'];
  
  const ws = XLSX.utils.aoa_to_sheet([
    headers,
    description
  ]);
  
  // 设置列宽
  ws['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, 
    { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 30 }
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '校友导入模板');
  XLSX.writeFile(wb, '校友导入模板.xlsx');
  
  ElMessage.success('模板下载成功');
}

function handleFileChange(file: any) {
  fileName.value = file.name;
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  const isCsv = file.name.endsWith('.csv');
  
  if (isExcel) {
    fileType.value = 'excel';
    parseExcel(file.raw);
  } else if (isCsv) {
    fileType.value = 'csv';
    parseCSV(file.raw);
  } else {
    ElMessage.error('请上传Excel(.xlsx/.xls)或CSV格式的文件');
    return false;
  }
  return false;
}

// 解析Excel文件
function parseExcel(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length < 2) {
        ElMessage.error('Excel文件格式不正确，请确保包含表头和数据');
        return;
      }
      
      const headers = (jsonData[0] as string[]).map(h => String(h).trim().replace(/\*$/, '')); // 去掉*标记
      // 跳过第二行说明行，从第三行开始读取数据
      const rows = jsonData.slice(2) as any[][];
      
      previewData.value = rows
        .filter(row => row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''))
        .map((row, index) => {
          const obj: Record<string, any> = { _rowNum: index + 2 };
          headers.forEach((h, i) => {
            const key = fieldMapping[h] || h;
            obj[key] = row[i] !== undefined ? String(row[i]).trim() : '';
          });
          return obj;
        });
      
      activeStep.value = 1;
      validatePreviewData();
      ElMessage.success(`已解析 ${previewData.value.length} 条数据`);
    } catch (e) {
      console.error('Excel解析错误:', e);
      ElMessage.error('Excel文件解析失败，请检查文件格式');
    }
  };
  reader.readAsArrayBuffer(file);
}

// 解析CSV文件
function parseCSV(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        ElMessage.error('CSV文件格式不正确，请确保包含表头和数据');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/\*$/, ''));
      
      // 跳过第二行说明行，从第三行开始读取数据
      previewData.value = lines.slice(2).map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const obj: Record<string, any> = { _rowNum: index + 2 };
        headers.forEach((h, i) => {
          const key = fieldMapping[h] || h;
          obj[key] = values[i] || '';
        });
        return obj;
      });
      
      activeStep.value = 1;
      validatePreviewData();
      ElMessage.success(`已解析 ${previewData.value.length} 条数据`);
    } catch (e) {
      console.error('CSV解析错误:', e);
      ElMessage.error('CSV文件解析失败，请检查文件格式');
    }
  };
  reader.readAsText(file);
}

// 验证预览数据
function validatePreviewData() {
  const errors: string[] = [];
  let errorCount = 0;
  const maxErrors = 10;
  
  previewData.value.forEach((item) => {
    if (errorCount >= maxErrors) return;
    
    const rowNum = item._rowNum;
    
    if (!item.name || item.name.trim() === '') {
      errors.push(`第${rowNum}行：姓名不能为空`);
      errorCount++;
    }
    
    if (!item.graduationYear || isNaN(parseInt(item.graduationYear))) {
      errors.push(`第${rowNum}行：届别必须为数字（如2024）`);
      errorCount++;
    } else {
      const year = parseInt(item.graduationYear);
      if (year < 1900 || year > 2100) {
        errors.push(`第${rowNum}行：届别年份应在1900-2100之间`);
        errorCount++;
      }
    }
  });
  
  if (errors.length > maxErrors) {
    errors.push(`...还有${errorCount - maxErrors}条错误`);
  }
  
  validationErrors.value = errors;
}

// 转换数据格式
function convertData(data: any[]) {
  return data.map(item => ({
    name: item.name || '',
    studentId: item.studentId || '',
    graduationYear: parseInt(item.graduationYear) || 0,
    className: item.className || '',
    major: item.major || '',
    industry: item.industry || '',
    currentCity: item.currentCity || '',
    workUnit: item.workUnit || '',
    phone: item.phone || '',
    email: item.email || '',
    photoUrl: item.photoUrl || '',
  }));
}

async function handleImport() {
  if (!previewData.value.length) {
    ElMessage.warning('请先上传数据文件');
    return;
  }

  if (validationErrors.value.length > 0) {
    ElMessage.error('数据验证未通过，请修正错误后再导入');
    return;
  }

  const data = convertData(previewData.value);
  
  loading.value = true;
  uploadProgress.value = 0;
  activeStep.value = 2;
  
  try {
    // 分批导入，每批500条
    const batchSize = 500;
    const total = data.length;
    let success = 0;
    let failed = 0;
    const failedItems: any[] = [];
    
    for (let i = 0; i < total; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const res = await adminApi.importAlumni(batch);
      
      if (res.data.success) {
        success += res.data.data.success || batch.length;
        failed += res.data.data.failed || 0;
        if (res.data.data.failedItems) {
          failedItems.push(...res.data.data.failedItems);
        }
      } else {
        failed += batch.length;
      }
      
      uploadProgress.value = Math.round(((i + batch.length) / total) * 100);
    }
    
    uploadProgress.value = 100;
    importResult.value = { 
      success, 
      failed, 
      failedItems,
      total: previewData.value.length 
    };
    
    activeStep.value = 3;
    ElMessage.success(`导入完成：成功${success}条，失败${failed}条`);
  } catch (e: any) {
    ElMessage.error('导入失败：' + (e.response?.data?.message || '网络错误'));
    activeStep.value = 1;
  } finally {
    loading.value = false;
  }
}

function resetImport() {
  activeStep.value = 0;
  previewData.value = [];
  importResult.value = null;
  uploadProgress.value = 0;
  fileName.value = '';
  fileType.value = '';
  validationErrors.value = [];
}

function clearData() {
  previewData.value = [];
  importResult.value = null;
  uploadProgress.value = 0;
  fileName.value = '';
  fileType.value = '';
  validationErrors.value = [];
  activeStep.value = 0;
}
</script>

<template>
  <div class="batch-import-container">
    <ElCard class="main-card">
      <template #header>
        <div class="card-header">
          <ElIcon :size="24" class="header-icon"><Upload /></ElIcon>
          <span class="text-xl font-bold">校友数据批量导入</span>
        </div>
      </template>

      <!-- 步骤条 -->
      <ElSteps :active="activeStep" finish-status="success" class="mb-6">
        <ElStep title="下载模板" description="获取标准导入格式">
          <template #icon><ElIcon><Download /></ElIcon></template>
        </ElStep>
        <ElStep title="上传文件" description="Excel或CSV格式">
          <template #icon><ElIcon><Document /></ElIcon></template>
        </ElStep>
        <ElStep title="数据预览" description="确认数据无误">
          <template #icon><ElIcon><CircleCheck /></ElIcon></template>
        </ElStep>
        <ElStep title="导入完成" description="查看导入结果">
          <template #icon><ElIcon><Check /></ElIcon></template>
        </ElStep>
      </ElSteps>

      <!-- 步骤1：下载模板 -->
      <div v-if="activeStep === 0" class="step-content">
        <ElAlert type="info" :closable="false" class="mb-4">
          <template #title>
            <div class="space-y-2">
              <p><strong>导入说明：</strong></p>
              <p>1. 支持Excel(.xlsx/.xls)和CSV格式，建议每次导入不超过5000条数据</p>
              <p>2. 必填字段：<span class="text-red-500">姓名、届别</span>（届别为数字年份，如2024）</p>
              <p>3. 可选字段：学号、班级、专业、行业、城市、工作单位、电话、邮箱、头像URL</p>
              <p>4. 表头可使用中文或英文，系统会自动识别</p>
            </div>
          </template>
        </ElAlert>

        <div class="template-download">
          <div class="template-info">
            <h3 class="font-bold mb-2">校友导入模板</h3>
            <p class="text-gray-500 text-sm mb-4">下载标准模板，按格式填写后上传</p>
            <ElButton type="primary" size="large" @click="downloadTemplate">
              <ElIcon class="mr-2"><Download /></ElIcon>
              下载Excel模板
            </ElButton>
          </div>
        </div>

        <div class="flex justify-center mt-6">
          <ElUpload
            :auto-upload="false"
            :show-file-list="false"
            accept=".xlsx,.xls,.csv"
            :on-change="handleFileChange"
          >
            <ElButton type="success" size="large">
              <ElIcon class="mr-2"><Upload /></ElIcon>
              我已准备好，开始上传
            </ElButton>
          </ElUpload>
        </div>
      </div>

      <!-- 步骤2-3：上传和预览 -->
      <div v-if="activeStep >= 1 && activeStep <= 2" class="step-content">
        <!-- 文件信息 -->
        <div v-if="fileName" class="file-info mb-4">
          <ElTag v-if="fileType === 'excel'" type="success" size="large">Excel</ElTag>
          <ElTag v-else-if="fileType === 'csv'" type="warning" size="large">CSV</ElTag>
          <span class="ml-3 font-medium">{{ fileName }}</span>
          <span class="ml-3 text-gray-500">共 {{ previewData.length }} 条数据</span>
          <ElButton type="primary" link class="ml-4" @click="clearData">重新选择</ElButton>
        </div>

        <!-- 验证错误提示 -->
        <div v-if="validationErrors.length > 0" class="validation-errors mb-4">
          <ElAlert type="error" :closable="false">
            <template #title>
              <div class="font-bold mb-2">数据验证未通过，请修正以下错误：</div>
            </template>
            <ul class="error-list">
              <li v-for="(error, index) in validationErrors" :key="index">{{ error }}</li>
            </ul>
          </ElAlert>
        </div>

        <!-- 导入进度 -->
        <div v-if="loading && activeStep === 2" class="progress-section mb-4">
          <ElProgress :percentage="uploadProgress" :stroke-width="24" status="success" striped />
          <p class="text-center text-gray-500 mt-3">
            正在导入数据，请稍候...（{{ Math.round(uploadProgress) }}%）
          </p>
          <p class="text-center text-gray-400 text-sm mt-1">
            大量数据分批处理中，请勿关闭页面
          </p>
        </div>

        <!-- 数据预览 -->
        <div v-if="previewData.length && !loading" class="preview-section">
          <div class="preview-header">
            <h3 class="font-bold">数据预览（前50条）</h3>
            <ElTag v-if="validationErrors.length === 0" type="success">验证通过</ElTag>
            <ElTag v-else type="danger">有 {{ validationErrors.length }} 处错误</ElTag>
          </div>
          
          <ElTable :data="previewData.slice(0, 50)" stripe max-height="500" size="small" class="preview-table">
            <ElTableColumn type="index" width="50" label="序号" />
            <ElTableColumn prop="name" label="姓名" min-width="80" />
            <ElTableColumn prop="studentId" label="学号" min-width="100" />
            <ElTableColumn prop="graduationYear" label="届别" width="70" />
            <ElTableColumn prop="className" label="班级" min-width="100" />
            <ElTableColumn prop="major" label="专业" min-width="100" />
            <ElTableColumn prop="industry" label="行业" min-width="100" />
            <ElTableColumn prop="currentCity" label="城市" min-width="80" />
            <ElTableColumn prop="workUnit" label="工作单位" min-width="150" show-overflow-tooltip />
            <ElTableColumn prop="phone" label="电话" min-width="120" />
            <ElTableColumn prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
          </ElTable>

          <div class="action-buttons mt-4">
            <ElButton @click="clearData">重新上传</ElButton>
            <ElButton 
              type="success" 
              :loading="loading" 
              @click="handleImport" 
              :disabled="validationErrors.length > 0"
            >
              确认导入 {{ previewData.length }} 条数据
            </ElButton>
          </div>
        </div>
      </div>

      <!-- 步骤4：导入完成 -->
      <div v-if="activeStep === 3" class="step-content">
        <ElResult
          :icon="importResult?.failed === 0 ? 'success' : importResult?.success > 0 ? 'warning' : 'error'"
          :title="importResult?.failed === 0 ? '导入成功' : '导入完成（部分失败）'"
          :sub-title="`共处理 ${importResult?.total} 条数据`"
        >
          <template #extra>
            <div class="result-stats">
              <div class="stat-item success">
                <div class="stat-value">{{ importResult?.success }}</div>
                <div class="stat-label">成功导入</div>
              </div>
              <div class="stat-item error">
                <div class="stat-value">{{ importResult?.failed }}</div>
                <div class="stat-label">导入失败</div>
              </div>
            </div>

            <div v-if="importResult?.failedItems?.length" class="failed-items mt-4">
              <h4 class="font-bold mb-2">失败明细：</h4>
              <ElTable :data="importResult.failedItems.slice(0, 20)" size="small" stripe>
                <ElTableColumn prop="name" label="姓名" width="100" />
                <ElTableColumn prop="graduationYear" label="届别" width="80" />
                <ElTableColumn prop="reason" label="失败原因" />
              </ElTable>
            </div>

            <div class="mt-6">
              <ElButton @click="resetImport">继续导入</ElButton>
              <ElButton type="primary" @click="$router.push('/alumni')">查看校友列表</ElButton>
            </div>
          </template>
        </ElResult>
      </div>
    </ElCard>
  </div>
</template>

<style scoped>
.batch-import-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  color: var(--el-color-primary);
}

.step-content {
  padding: 20px 0;
}

.template-download {
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin: 20px 0;
}

.template-info {
  max-width: 400px;
  margin: 0 auto;
}

.file-info {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.validation-errors {
  max-height: 200px;
  overflow-y: auto;
}

.error-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.error-list li {
  padding: 4px 0;
  color: var(--el-color-danger);
  font-size: 13px;
}

.progress-section {
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.preview-section {
  margin-top: 20px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview-table {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin: 20px 0;
}

.stat-item {
  text-align: center;
  padding: 20px 40px;
  border-radius: 12px;
  min-width: 120px;
}

.stat-item.success {
  background: var(--el-color-success-light-9);
}

.stat-item.error {
  background: var(--el-color-danger-light-9);
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  line-height: 1;
}

.stat-item.success .stat-value {
  color: var(--el-color-success);
}

.stat-item.error .stat-value {
  color: var(--el-color-danger);
}

.stat-label {
  margin-top: 8px;
  color: var(--el-text-color-regular);
}

.failed-items {
  max-width: 800px;
  margin: 0 auto;
  text-align: left;
}

:deep(.el-steps) {
  padding: 20px 40px;
}

:deep(.el-result) {
  padding: 40px;
}
</style>

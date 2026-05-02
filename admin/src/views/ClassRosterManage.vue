<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  ElCard, ElTable, ElTableColumn, ElButton, ElPagination,
  ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElSelect, ElOption,
  ElInput, ElInputNumber, ElTabs, ElTabPane, ElUpload, ElRadioGroup, ElRadioButton
} from 'element-plus';
import { Download, Upload, Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';
import * as XLSX from 'xlsx';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterYear = ref<number | undefined>();

const yearOptions = ref<number[]>([]);

const dialogVisible = ref(false);
const dialogTitle = ref('新增班级');
const editingId = ref<string | null>(null);

const form = ref({
  className: '',
  graduationYear: new Date().getFullYear(),
  headTeacher: '',
  description: '',
});

// 班级详情对话框
const detailDialogVisible = ref(false);
const currentRoster = ref<any>(null);
const activeTab = ref('students');

// 学生管理
const newStudent = ref({ studentName: '', studentId: '' });
const importStudentsText = ref('');
const importMode = ref<'text' | 'excel' | 'auto'>('auto');

// 编辑学生
const editStudentDialogVisible = ref(false);
const editingStudent = ref<any>(null);

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getClassRosterList({
      graduationYear: filterYear.value,
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
    const res = await adminApi.getClassRosterOptions();
    if (res.data.success) {
      yearOptions.value = res.data.data.years;
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
  dialogTitle.value = '新增班级';
  form.value = {
    className: '',
    graduationYear: new Date().getFullYear(),
    headTeacher: '',
    description: '',
  };
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id;
  dialogTitle.value = '编辑班级';
  form.value = {
    className: row.className || row.class_name,
    graduationYear: row.graduationYear || row.graduation_year,
    headTeacher: row.headTeacher || row.head_teacher || '',
    description: row.description || '',
  };
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该班级吗？关联的学生记录也会被删除。', '提示', { type: 'warning' });
    await adminApi.deleteClassRoster(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {
    // 取消删除
  }
}

async function handleViewDetail(row: any) {
  try {
    const res = await adminApi.getClassRosterById(row.id);
    if (res.data.success) {
      currentRoster.value = res.data.data;
      detailDialogVisible.value = true;
    }
  } catch (e) {
    ElMessage.error('加载详情失败');
  }
}

async function handleSubmit() {
  if (!form.value.className.trim()) {
    ElMessage.warning('请填写班级名称');
    return;
  }

  try {
    if (editingId.value) {
      await adminApi.updateClassRoster(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await adminApi.createClassRoster(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
    loadOptions();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}

async function addStudent() {
  if (!newStudent.value.studentName.trim()) {
    ElMessage.warning('请填写学生姓名');
    return;
  }
  try {
    await adminApi.addClassStudent(currentRoster.value.id, newStudent.value);
    ElMessage.success('添加成功');
    newStudent.value = { studentName: '', studentId: '' };
    // 刷新详情
    const res = await adminApi.getClassRosterById(currentRoster.value.id);
    if (res.data.success) {
      currentRoster.value = res.data.data;
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '添加失败');
  }
}

async function removeStudent(studentId: string) {
  try {
    await adminApi.removeClassStudent(currentRoster.value.id, studentId);
    ElMessage.success('删除成功');
    // 刷新详情
    const res = await adminApi.getClassRosterById(currentRoster.value.id);
    if (res.data.success) {
      currentRoster.value = res.data.data;
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '删除失败');
  }
}

// 编辑学生
function handleEditStudent(row: any) {
  editingStudent.value = {
    id: row.id,
    studentName: row.studentName || row.student_name,
    studentId: row.studentId || row.student_id || ''};
  editStudentDialogVisible.value = true;
}

async function saveStudent() {
  if (!editingStudent.value.studentName.trim()) {
    ElMessage.warning('请填写学生姓名');
    return;
  }
  try {
    await adminApi.updateClassStudent(currentRoster.value.id, editingStudent.value.id, {
      studentName: editingStudent.value.studentName,
      studentId: editingStudent.value.studentId,
    });
    ElMessage.success('更新成功');
    editStudentDialogVisible.value = false;
    // 刷新详情
    const res = await adminApi.getClassRosterById(currentRoster.value.id);
    if (res.data.success) {
      currentRoster.value = res.data.data;
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '更新失败');
  }
}

// 下载模板
function downloadTemplate() {
  const headers = ['姓名*', '学号'];
  const example = ['张三', '2024001'];
  
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws['!cols'] = [{ wch: 15 }, { wch: 15 }];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '学生名单导入模板');
  XLSX.writeFile(wb, '学生名单导入模板.xlsx');
  
  ElMessage.success('模板下载成功');
}

// Excel导入
function handleExcelUpload(file: any) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      if (jsonData.length < 2) {
        ElMessage.error('Excel文件格式不正确');
        return;
      }
      
      const rows = jsonData.slice(1) as any[][];
      const students = rows
        .filter(row => row[0]) // 姓名不能为空
        .map(row => ({
          studentName: String(row[0] || '').trim(),
          studentId: row[1] ? String(row[1]).trim() : '',
        }));
      
      if (students.length === 0) {
        ElMessage.warning('没有有效的学生数据');
        return;
      }
      
      importStudentsExcel(students);
    } catch (err) {
      console.error('Excel解析错误:', err);
      ElMessage.error('Excel文件解析失败');
    }
  };
  reader.readAsArrayBuffer(file.raw);
  return false;
}

async function importStudentsExcel(students: any[]) {
  try {
    const res = await adminApi.importClassStudents(currentRoster.value.id, students);
    if (res.data.success) {
      const result = res.data.data;
      ElMessage.success(`导入完成：成功 ${result.success} 人，失败 ${result.failed} 人`);
      // 刷新详情
      const detailRes = await adminApi.getClassRosterById(currentRoster.value.id);
      if (detailRes.data.success) {
        currentRoster.value = detailRes.data.data;
      }
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '导入失败');
  }
}

async function importStudents() {
  if (!importStudentsText.value.trim()) {
    ElMessage.warning('请输入学生名单');
    return;
  }
  
  // 解析文本，每行一个学生，格式：姓名,学号
  const lines = importStudentsText.value.trim().split('\n');
  const students = lines.map(line => {
    const parts = line.split(/[,，\t]/);
    return {
      studentName: parts[0]?.trim() || '',
      studentId: parts[1]?.trim() || ''};
  }).filter(s => s.studentName);

  if (students.length === 0) {
    ElMessage.warning('没有有效的学生数据');
    return;
  }

  try {
    const res = await adminApi.importClassStudents(currentRoster.value.id, students);
    if (res.data.success) {
      const result = res.data.data;
      ElMessage.success(`导入完成：成功 ${result.success} 人，失败 ${result.failed} 人`);
      importStudentsText.value = '';
      // 刷新详情
      const detailRes = await adminApi.getClassRosterById(currentRoster.value.id);
      if (detailRes.data.success) {
        currentRoster.value = detailRes.data.data;
      }
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '导入失败');
  }
}

async function importFromDescription() {
  const desc = currentRoster.value.description;
  if (!desc || !desc.trim()) {
    ElMessage.warning('班级简介为空，无法解析学生名单');
    return;
  }

  // 改进正则表达式，更好地匹配名字。考虑中文名字长度通常为2-4个字，
  // 匹配连续的中文，或者被空格、顿号、逗号分隔的名字
  const names = desc.match(/[\u4e00-\u9fa5]{2,4}/g);
  
  if (!names || names.length === 0) {
    ElMessage.warning('未能从简介中解析出有效的学生姓名');
    return;
  }

  // 去重
  const uniqueNames = Array.from(new Set(names));

  try {
    await ElMessageBox.confirm(
      `解析到 ${uniqueNames.length} 个候选姓名，是否将其导入学生名单？\n建议导入后手动校对。`,
      '从简介解析名单',
      { type: 'info' }
    );

    const students = uniqueNames.map(name => ({ studentName: name }));
    const res = await adminApi.importClassStudents(currentRoster.value.id, students);
    
    if (res.data.success) {
      ElMessage.success(`导入成功：${res.data.data.success}人`);
      // 刷新详情
      const detailRes = await adminApi.getClassRosterById(currentRoster.value.id);
      if (detailRes.data.success) {
        currentRoster.value = detailRes.data.data;
      }
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('解析导入失败');
    }
  }
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
          <span class="text-lg font-bold">班级名录管理</span>
          <div class="flex gap-4">
            <ElSelect v-model="filterYear" placeholder="选择年份" clearable style="width: 120px" @change="handleSearch">
              <ElOption v-for="year in yearOptions" :key="year" :label="`${year}届`" :value="year" />
            </ElSelect>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton type="success" @click="handleAdd">新增班级</ElButton>
          </div>
        </div>
      </template>

      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="班级名称" min-width="150">
          <template #default="{ row }">{{ row.className || row.class_name }}</template>
        </ElTableColumn>
        <ElTableColumn label="毕业年份" width="100">
          <template #default="{ row }">{{ row.graduationYear || row.graduation_year }}届</template>
        </ElTableColumn>
        <ElTableColumn label="班主任" width="120">
          <template #default="{ row }">{{ row.headTeacher || row.head_teacher || '-' }}</template>
        </ElTableColumn>
        <ElTableColumn label="学生人数" width="100">
          <template #default="{ row }">{{ row.studentCount || row.student_count || 0 }}人</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton type="info" size="small" @click="handleViewDetail(row)">详情</ElButton>
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
        <ElFormItem label="班级名称" required>
          <ElInput v-model="form.className" placeholder="如：计算机1班" />
        </ElFormItem>
        <ElFormItem label="毕业年份" required>
          <ElInputNumber v-model="form.graduationYear" :min="1900" :max="2100" />
        </ElFormItem>
        <ElFormItem label="班主任">
          <ElInput v-model="form.headTeacher" placeholder="班主任姓名" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="form.description" type="textarea" :rows="3" placeholder="班级描述" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 班级详情对话框 -->
    <ElDialog v-model="detailDialogVisible" title="班级详情" width="900px">
      <div v-if="currentRoster">
        <div class="mb-4 p-4 bg-gray-50 rounded">
          <h3 class="text-lg font-bold mb-2">{{ currentRoster.className || currentRoster.class_name }}</h3>
          <p class="text-gray-600">
            {{ currentRoster.graduationYear || currentRoster.graduation_year }}届 | 
            班主任：{{ currentRoster.headTeacher || currentRoster.head_teacher || '未设置' }} |
            学生人数：{{ currentRoster.students?.length || 0 }}人
          </p>
        </div>

        <ElTabs v-model="activeTab">
          <ElTabPane label="学生名单" name="students">
            <div class="mb-4 flex gap-2 items-center flex-wrap">
              <ElInput v-model="newStudent.studentName" placeholder="姓名" style="width: 120px" />
              <ElInput v-model="newStudent.studentId" placeholder="学号" style="width: 120px" />
              <ElButton type="primary" @click="addStudent">
                <Plus class="mr-1" />添加学生
              </ElButton>
            </div>
            
            <ElTable :data="currentRoster.students || []" max-height="300">
              <ElTableColumn label="姓名">
                <template #default="{ row }">{{ row.studentName || row.student_name }}</template>
              </ElTableColumn>
              <ElTableColumn label="学号">
                <template #default="{ row }">{{ row.studentId || row.student_id || '-' }}</template>
              </ElTableColumn>
              <ElTableColumn label="关联校友" width="100">
                <template #default="{ row }">
                  <ElTag v-if="row.alumniId" type="success" size="small">已关联</ElTag>
                  <span v-else class="text-gray-400 text-xs">未关联</span>
                </template>
              </ElTableColumn>
              <ElTableColumn label="操作" width="120" fixed="right">
                <template #default="{ row }">
                  <ElButton type="primary" size="small" @click="handleEditStudent(row)">编辑</ElButton>
                  <ElButton type="danger" size="small" @click="removeStudent(row.id)">删除</ElButton>
                </template>
              </ElTableColumn>
            </ElTable>

            <div class="mt-4 border-t pt-4">
              <div class="flex items-center gap-4 mb-3">
                <span class="font-bold">批量导入：</span>
                <ElRadioGroup v-model="importMode">
                  <ElRadioButton value="text">文本粘贴</ElRadioButton>
                  <ElRadioButton value="excel">Excel上传</ElRadioButton>
                  <ElRadioButton value="auto">从简介解析</ElRadioButton>
                </ElRadioGroup>
              </div>
              
              <!-- 自动解析 -->
              <div v-if="importMode === 'auto'">
                <p class="text-gray-500 mb-2 text-sm">系统将尝试从班级简介中识别中文姓名并导入。</p>
                <div class="p-3 bg-blue-50 border border-blue-100 rounded mb-2 text-sm">
                  <strong>当前简介内容：</strong>
                  <p class="mt-1 text-gray-700 italic">{{ currentRoster.description || '(暂无简介)' }}</p>
                </div>
                <ElButton type="primary" @click="importFromDescription" :disabled="!currentRoster.description">立即解析并导入</ElButton>
              </div>
              
              <!-- 文本导入 -->
              <div v-if="importMode === 'text'">
                <p class="text-gray-500 mb-2 text-sm">每行一个学生，格式：姓名,学号</p>
                <ElInput v-model="importStudentsText" type="textarea" :rows="4" placeholder="张三,2020001&#10;李四,2020002" />
                <ElButton type="primary" class="mt-2" @click="importStudents">批量导入</ElButton>
              </div>
              
              <!-- Excel导入 -->
              <div v-if="importMode === 'excel'" class="flex items-center gap-4">
                <ElUpload
                  :auto-upload="false"
                  :show-file-list="false"
                  accept=".xlsx,.xls"
                  :on-change="handleExcelUpload"
                >
                  <ElButton type="success">
                    <Upload class="mr-1" />选择Excel文件
                  </ElButton>
                </ElUpload>
                <ElButton @click="downloadTemplate">
                  <Download class="mr-1" />下载模板
                </ElButton>
                <span class="text-gray-500 text-sm">支持xlsx格式，每行一个学生</span>
              </div>
            </div>
          </ElTabPane>

          <ElTabPane label="关联毕业照" name="photos">
            <div v-if="currentRoster.photos?.length" class="grid grid-cols-3 gap-4">
              <div v-for="photo in currentRoster.photos" :key="photo.id" class="border rounded p-2">
                <img :src="photo.originalUrl || photo.original_url" class="w-full h-32 object-cover rounded" />
                <p class="text-center mt-2 text-sm">{{ photo.year }}届</p>
              </div>
            </div>
            <div v-else class="text-center text-gray-400 py-8">
              暂无关联的毕业照
            </div>
          </ElTabPane>
        </ElTabs>
      </div>
      <template #footer>
        <ElButton @click="detailDialogVisible = false">关闭</ElButton>
      </template>
    </ElDialog>

    <!-- 编辑学生对话框 -->
    <ElDialog v-model="editStudentDialogVisible" title="编辑学生" width="400px">
      <ElForm v-if="editingStudent" label-width="80px">
        <ElFormItem label="姓名" required>
          <ElInput v-model="editingStudent.studentName" placeholder="学生姓名" />
        </ElFormItem>
        <ElFormItem label="学号">
          <ElInput v-model="editingStudent.studentId" placeholder="学号（选填）" />
        </ElFormItem>
        </ElForm>
      <template #footer>
        <ElButton @click="editStudentDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveStudent">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

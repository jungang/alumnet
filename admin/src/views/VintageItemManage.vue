<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  ElCard, ElTable, ElTableColumn, ElButton, ElPagination,
  ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElSelect, ElOption,
  ElInput, ElInputNumber, ElImage, ElUpload, ElIcon
} from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const filterType = ref('');
const filterEra = ref('');

const typeOptions = ref<string[]>([]);
const eraOptions = ref<string[]>([]);

const dialogVisible = ref(false);
const dialogTitle = ref('新增老物件');
const editingId = ref<string | null>(null);

const typeLabels: Record<string, string> = {
  admission_notice: '录取通知书',
  diploma: '毕业证',
  badge: '校徽',
  meal_ticket: '饭票',
  textbook: '课本',
  photo: '老照片',
  certificate: '证书',
  other: '其他',
};

const form = ref({
  name: '',
  itemType: 'other',
  era: '',
  description: '',
  images: [] as string[],
  sortOrder: 0,
  donorName: '',
  donorClass: '',
});

const newImageUrl = ref('');

// 上传请求头
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

// 处理图片上传成功
function handleImageSuccess(res: any) {
  if (res.success) {
    form.value.images.push(res.data.url);
    ElMessage.success('图片上传成功');
  } else {
    ElMessage.error(res.message || '上传失败');
  }
}

// 上传前检查
function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/');
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isImage) {
    ElMessage.error('只能上传图片文件');
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB');
  }
  return isImage && isLt5M;
}

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getVintageItemList({
      itemType: filterType.value || undefined,
      era: filterEra.value || undefined,
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
    const res = await adminApi.getVintageItemOptions();
    if (res.data.success) {
      typeOptions.value = res.data.data.types;
      eraOptions.value = res.data.data.eras;
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
  dialogTitle.value = '新增老物件';
  form.value = {
    name: '',
    itemType: 'other',
    era: '',
    description: '',
    images: [],
    sortOrder: 0,
    donorName: '',
    donorClass: '',
  };
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id;
  dialogTitle.value = '编辑老物件';
  form.value = {
    name: row.name,
    itemType: row.itemType || row.item_type,
    era: row.era || '',
    description: row.description || '',
    images: row.images || [],
    sortOrder: row.sortOrder || row.sort_order || 0,
    donorName: row.donorName || row.donor_name || '',
    donorClass: row.donorClass || row.donor_class || '',
  };
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该老物件吗？', '提示', { type: 'warning' });
    await adminApi.deleteVintageItem(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {
    // 取消删除
  }
}

function addImage() {
  if (newImageUrl.value.trim()) {
    form.value.images.push(newImageUrl.value.trim());
    newImageUrl.value = '';
  }
}

function removeImage(index: number) {
  form.value.images.splice(index, 1);
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请填写物品名称');
    return;
  }

  try {
    if (editingId.value) {
      await adminApi.updateVintageItem(editingId.value, form.value);
      ElMessage.success('更新成功');
    } else {
      await adminApi.createVintageItem(form.value);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    loadData();
    loadOptions();
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '操作失败');
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
          <span class="text-lg font-bold">老物件管理</span>
          <div class="flex gap-4">
            <ElSelect v-model="filterType" placeholder="选择类型" clearable style="width: 150px" @change="handleSearch">
              <ElOption v-for="type in Object.keys(typeLabels)" :key="type" :label="typeLabels[type]" :value="type" />
            </ElSelect>
            <ElSelect v-model="filterEra" placeholder="选择年代" clearable style="width: 120px" @change="handleSearch">
              <ElOption v-for="era in eraOptions" :key="era" :label="era" :value="era" />
            </ElSelect>
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton type="success" @click="handleAdd">新增老物件</ElButton>
          </div>
        </div>
      </template>

      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="图片" width="100">
          <template #default="{ row }">
            <ElImage v-if="row.images?.length" :src="row.images[0]" style="width: 60px; height: 60px" fit="cover" :preview-src-list="row.images" preview-teleported />
            <span v-else class="text-gray-400">无图片</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="name" label="名称" min-width="150" />
        <ElTableColumn label="类型" width="120">
          <template #default="{ row }">{{ typeLabels[row.itemType || row.item_type] || row.itemType || row.item_type }}</template>
        </ElTableColumn>
        <ElTableColumn prop="era" label="年代" width="100" />
        <ElTableColumn label="图片数" width="80">
          <template #default="{ row }">{{ row.images?.length || 0 }}</template>
        </ElTableColumn>
        <ElTableColumn label="排序" width="80">
          <template #default="{ row }">{{ row.sortOrder || row.sort_order || 0 }}</template>
        </ElTableColumn>
        <ElTableColumn label="捐赠者" width="120">
          <template #default="{ row }">{{ row.donorName || row.donor_name || '-' }}</template>
        </ElTableColumn>
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
        <ElFormItem label="名称" required>
          <ElInput v-model="form.name" placeholder="物品名称" />
        </ElFormItem>
        <ElFormItem label="类型" required>
          <ElSelect v-model="form.itemType" style="width: 100%">
            <ElOption v-for="(label, type) in typeLabels" :key="type" :label="label" :value="type" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="年代">
          <ElInput v-model="form.era" placeholder="如：1980年代" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="form.description" type="textarea" :rows="3" placeholder="物品描述" />
        </ElFormItem>
        <ElFormItem label="图片上传">
          <div class="w-full">
            <ElUpload
              class="image-uploader"
              :action="'/xyl/api/upload/photo'"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleImageSuccess"
              :before-upload="beforeImageUpload"
            >
              <div class="upload-btn">
                <ElIcon><Plus /></ElIcon>
                <span>点击上传</span>
              </div>
            </ElUpload>
            <div class="flex flex-wrap gap-2 mt-2">
              <div v-for="(img, index) in form.images" :key="index" class="relative">
                <ElImage :src="img" style="width: 80px; height: 80px" fit="cover" :preview-src-list="[img]" preview-teleported />
                <ElButton type="danger" size="small" circle class="absolute -top-2 -right-2" @click="removeImage(index)">×</ElButton>
              </div>
            </div>
          </div>
        </ElFormItem>
        <ElFormItem label="图片URL">
          <div class="flex gap-2">
            <ElInput v-model="newImageUrl" placeholder="输入图片URL（可选）" />
            <ElButton type="primary" @click="addImage">添加</ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.sortOrder" :min="0" />
        </ElFormItem>
        <ElFormItem label="捐赠者">
          <ElInput v-model="form.donorName" placeholder="捐赠者姓名" />
        </ElFormItem>
        <ElFormItem label="捐赠班级">
          <ElInput v-model="form.donorClass" placeholder="捐赠者班级" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

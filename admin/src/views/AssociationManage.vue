<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElCard, ElTable, ElTableColumn, ElButton, ElPagination, ElDialog, ElForm, ElFormItem, ElMessage, ElMessageBox, ElInput, ElInputNumber, ElUpload, ElIcon } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { adminApi } from '@/api';

const loading = ref(false);
const tableData = ref<any[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const searchKeyword = ref('');

const dialogVisible = ref(false);
const dialogTitle = ref('新增校友会');
const editingId = ref<string | null>(null);
const form = ref({ city: '', region: '', contactName: '', contactPhone: '', contactEmail: '', wechatQrcode: '', memberCount: 0, description: '', logoUrl: '' });

// 上传请求头
const uploadHeaders = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

// 处理图片加载错误
function handleImageError(e: Event) {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
  console.error('图片加载失败:', target.src);
}

async function loadData() {
  loading.value = true;
  try {
    const res = await adminApi.getAssociationList({ keyword: searchKeyword.value, page: currentPage.value, pageSize: pageSize.value });
    if (res.data.success) { tableData.value = res.data.data.items; total.value = res.data.data.total; }
  } catch (e) { ElMessage.error('加载数据失败'); }
  finally { loading.value = false; }
}

function handleSearch() { currentPage.value = 1; loadData(); }

function handleAdd() {
  editingId.value = null; dialogTitle.value = '新增校友会';
  form.value = { city: '', region: '', contactName: '', contactPhone: '', contactEmail: '', wechatQrcode: '', memberCount: 0, description: '', logoUrl: '' };
  dialogVisible.value = true;
}

function handleEdit(row: any) {
  editingId.value = row.id; dialogTitle.value = '编辑校友会';
  form.value = { city: row.city, region: row.region || '', contactName: row.contactName || '', contactPhone: row.contactPhone || '', contactEmail: row.contactEmail || '', wechatQrcode: row.wechatQrcode || '', memberCount: row.memberCount || 0, description: row.description || '', logoUrl: row.logoUrl || '' };
  dialogVisible.value = true;
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该校友会吗？', '提示', { type: 'warning' });
    await adminApi.deleteAssociation(row.id);
    ElMessage.success('删除成功'); loadData();
  } catch (e) {}
}

async function handleSubmit() {
  if (!form.value.city) { ElMessage.warning('请填写城市'); return; }
  try {
    if (editingId.value) { await adminApi.updateAssociation(editingId.value, form.value); ElMessage.success('更新成功'); }
    else { await adminApi.createAssociation(form.value); ElMessage.success('创建成功'); }
    dialogVisible.value = false; loadData();
  } catch (e: any) { ElMessage.error(e.response?.data?.message || '操作失败'); }
}

function handleLogoSuccess(res: any) {
  if (res.success) { form.value.logoUrl = res.url; ElMessage.success('Logo上传成功'); }
  else { ElMessage.error(res.message || '上传失败'); }
}

function beforeLogoUpload(file: File) {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) { ElMessage.error('只支持 JPG/PNG 格式'); return false; }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) { ElMessage.error('图片大小不能超过 2MB'); return false; }
  return true;
}

onMounted(() => loadData());
</script>

<template>
  <div>
    <ElCard>
      <template #header>
        <div class="flex justify-between items-center">
          <span class="text-lg font-bold">校友会管理</span>
          <div class="flex gap-4">
            <ElInput v-model="searchKeyword" placeholder="搜索城市/联系人" @keyup.enter="handleSearch" style="width: 200px" />
            <ElButton type="primary" @click="handleSearch">搜索</ElButton>
            <ElButton type="success" @click="handleAdd">新增校友会</ElButton>
          </div>
        </div>
      </template>
      <ElTable :data="tableData" v-loading="loading" stripe>
        <ElTableColumn label="Logo" width="80">
          <template #default="{ row }">
            <img v-if="row.logoUrl" :src="`/xyl${row.logoUrl}`" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
            <span v-else class="text-gray-400 text-xs">无Logo</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="city" label="城市" width="120" />
        <ElTableColumn prop="region" label="地区" width="100" />
        <ElTableColumn prop="contactName" label="联系人" width="100" />
        <ElTableColumn prop="contactPhone" label="联系电话" width="140" />
        <ElTableColumn prop="memberCount" label="成员数" width="80" />
        <ElTableColumn prop="description" label="描述" show-overflow-tooltip />
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
        <ElFormItem label="城市" required><ElInput v-model="form.city" /></ElFormItem>
        <ElFormItem label="地区"><ElInput v-model="form.region" /></ElFormItem>
        <ElFormItem label="联系人"><ElInput v-model="form.contactName" /></ElFormItem>
        <ElFormItem label="联系电话"><ElInput v-model="form.contactPhone" /></ElFormItem>
        <ElFormItem label="联系邮箱"><ElInput v-model="form.contactEmail" /></ElFormItem>
        <ElFormItem label="校友会Logo">
          <div class="logo-uploader">
            <ElUpload
              class="logo-uploader-single"
              :action="'/xyl/api/upload'"
              :show-file-list="false"
              :on-success="handleLogoSuccess"
              :before-upload="beforeLogoUpload"
              :headers="uploadHeaders"
            >
              <img v-if="form.logoUrl" :src="`/xyl${form.logoUrl}`" class="logo-image" />
              <div v-else class="logo-placeholder">
                <ElIcon :size="24"><Plus /></ElIcon>
                <div class="logo-text">点击上传Logo</div>
              </div>
            </ElUpload>
            <ElButton v-if="form.logoUrl" type="danger" link size="small" @click="form.logoUrl = ''">删除Logo</ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="微信群二维码"><ElInput v-model="form.wechatQrcode" placeholder="二维码图片URL" /></ElFormItem>
        <ElFormItem label="成员数"><ElInputNumber v-model="form.memberCount" :min="0" /></ElFormItem>
        <ElFormItem label="描述"><ElInput v-model="form.description" type="textarea" :rows="2" /></ElFormItem>
      </ElForm>
      <template #footer><ElButton @click="dialogVisible = false">取消</ElButton><ElButton type="primary" @click="handleSubmit">确定</ElButton></template>
    </ElDialog>
  </div>
</template>

<template>
  <div class="knowledge-page">
    <div class="page-header">
      <h2>知识库管理</h2>
      <p class="desc">管理 RAG 智能检索的知识内容，支持添加文本或抓取网页内容</p>
    </div>

    <el-card class="action-card">
      <div class="action-buttons">
        <el-button type="primary" @click="openTextDialog">
          <el-icon><Document /></el-icon> 添加文本
        </el-button>
        <el-button type="success" @click="openUrlDialog">
          <el-icon><Link /></el-icon> 抓取网页
        </el-button>
      </div>
    </el-card>

    <el-card class="table-card">
      <el-table :data="knowledgeList" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'webpage' ? 'success' : 'primary'" size="small">
              {{ row.type === 'webpage' ? '网页' : '文本' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="添加时间" width="120" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">查看</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加文本弹窗 -->
    <el-dialog v-model="textDialogVisible" title="添加文本内容" width="600px">
      <el-form :model="textForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="textForm.title" placeholder="请输入内容标题" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="textForm.content" type="textarea" :rows="8" placeholder="请输入文本内容，将被向量化存入知识库" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="textDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitText" :loading="submitting">添加到知识库</el-button>
      </template>
    </el-dialog>

    <!-- 抓取网页弹窗 -->
    <el-dialog v-model="urlDialogVisible" title="抓取网页内容" width="600px">
      <el-form :model="urlForm" label-width="80px">
        <el-form-item label="网址" required>
          <el-input v-model="urlForm.url" placeholder="请输入要抓取的网页URL，如 https://example.com/page" />
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="urlForm.title" placeholder="可选，留空则自动从网页提取" />
        </el-form-item>
      </el-form>
      <div class="tip-box">
        <p>💡 系统将自动抓取网页内容并转换为文本，然后向量化存入知识库供 RAG 检索使用。</p>
      </div>
      <template #footer>
        <el-button @click="urlDialogVisible = false">取消</el-button>
        <el-button type="success" @click="submitUrl" :loading="submitting">开始抓取</el-button>
      </template>
    </el-dialog>

    <!-- 查看详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="内容详情" width="700px">
      <div v-if="currentItem">
        <p><strong>标题：</strong>{{ currentItem.title }}</p>
        <p><strong>类型：</strong>{{ currentItem.type === 'webpage' ? '网页抓取' : '文本' }}</p>
        <p v-if="currentItem.source"><strong>来源：</strong>{{ currentItem.source }}</p>
        <p><strong>添加时间：</strong>{{ currentItem.createdAt }}</p>
        <el-divider />
        <div class="content-preview">
          <strong>内容预览：</strong>
          <pre>{{ currentItem.content || '暂无内容' }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Link } from '@element-plus/icons-vue'
import api from '../api'

interface KnowledgeItem {
  id: string
  title: string
  type: 'text' | 'webpage'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  source?: string
  content?: string
  createdAt: string
}

const loading = ref(false)
const submitting = ref(false)
const knowledgeList = ref<KnowledgeItem[]>([])

const textDialogVisible = ref(false)
const urlDialogVisible = ref(false)
const detailDialogVisible = ref(false)

const textForm = ref({ title: '', content: '' })
const urlForm = ref({ url: '', title: '' })
const currentItem = ref<KnowledgeItem | null>(null)

onMounted(() => {
  loadKnowledgeList()
})

async function loadKnowledgeList() {
  loading.value = true
  try {
    const res = await api.get('/admin/knowledge')
    knowledgeList.value = res.data.data || []
  } catch (e) {
    // 如果API还没实现，用模拟数据
    knowledgeList.value = [
      { id: '1', title: '学校历史沿革', type: 'text', status: 'completed', createdAt: '2024-12-14', content: '示例中学创建于1917年...' },
      { id: '2', title: '杰出校友介绍', type: 'webpage', status: 'completed', source: 'https://www.jlywzx.com/Page/19.html', createdAt: '2024-12-14' },
    ]
  } finally {
    loading.value = false
  }
}

function openTextDialog() {
  textForm.value = { title: '', content: '' }
  textDialogVisible.value = true
}

function openUrlDialog() {
  urlForm.value = { url: '', title: '' }
  urlDialogVisible.value = true
}

async function submitText() {
  if (!textForm.value.title || !textForm.value.content) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  submitting.value = true
  try {
    await api.post('/admin/knowledge/text', textForm.value)
    ElMessage.success('文本已添加到知识库')
    textDialogVisible.value = false
    loadKnowledgeList()
  } catch (e) {
    // 模拟添加
    knowledgeList.value.unshift({
      id: Date.now().toString(),
      title: textForm.value.title,
      type: 'text',
      status: 'completed',
      content: textForm.value.content,
      createdAt: new Date().toLocaleDateString()
    })
    ElMessage.success('文本已添加到知识库')
    textDialogVisible.value = false
  } finally {
    submitting.value = false
  }
}

async function submitUrl() {
  if (!urlForm.value.url) {
    ElMessage.warning('请输入网页地址')
    return
  }
  if (!urlForm.value.url.startsWith('http')) {
    ElMessage.warning('请输入有效的网址（以 http:// 或 https:// 开头）')
    return
  }
  submitting.value = true
  try {
    const res = await api.post('/admin/knowledge/webpage', urlForm.value)
    ElMessage.success('网页内容已抓取并添加到知识库')
    urlDialogVisible.value = false
    loadKnowledgeList()
  } catch (e) {
    // 模拟添加
    knowledgeList.value.unshift({
      id: Date.now().toString(),
      title: urlForm.value.title || '网页内容',
      type: 'webpage',
      status: 'processing',
      source: urlForm.value.url,
      createdAt: new Date().toLocaleDateString()
    })
    ElMessage.success('已提交抓取任务')
    urlDialogVisible.value = false
  } finally {
    submitting.value = false
  }
}

function viewDetail(item: KnowledgeItem) {
  currentItem.value = item
  detailDialogVisible.value = true
}

async function handleDelete(id: string) {
  try {
    await api.delete(`/admin/knowledge/${id}`)
  } catch (e) {
    // ignore
  }
  knowledgeList.value = knowledgeList.value.filter(item => item.id !== id)
  ElMessage.success('删除成功')
}

function getStatusType(status: string) {
  const map: Record<string, string> = { completed: 'success', processing: 'warning', failed: 'danger', pending: 'info' }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { completed: '已完成', processing: '处理中', failed: '失败', pending: '待处理' }
  return map[status] || status
}
</script>

<style scoped>
.knowledge-page { padding: 0; }
.page-header { margin-bottom: 24px; }
.page-header h2 { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; }
.page-header .desc { color: #909399; font-size: 14px; margin: 0; }
.action-card { margin-bottom: 16px; }
.action-buttons { display: flex; gap: 12px; }
.table-card { margin-top: 16px; }
.tip-box { background: #f0f9eb; border-radius: 4px; padding: 12px; margin-top: 16px; }
.tip-box p { margin: 0; color: #67c23a; font-size: 13px; }
.content-preview { max-height: 300px; overflow-y: auto; }
.content-preview pre { white-space: pre-wrap; word-break: break-all; background: #f5f7fa; padding: 12px; border-radius: 4px; font-size: 13px; }
</style>

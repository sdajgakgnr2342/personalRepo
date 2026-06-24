<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { lockSecretRoom } from '@/utils/secretRoom'
import { toastError, toastSuccess, toastProgress, updateToast, dismiss } from '@/utils/toast'
import WechatConfirmDialog from '@/components/notebook/WechatConfirmDialog.vue'

const router = useRouter()
const vaultStore = useVaultStore()

const fileLabels = ref({})
const uploading = ref(false)
const uploadProgress = ref(0)
const fileInput = ref(null)
const deleteDialogVisible = ref(false)
const deleteTarget = ref(null)
const previewVisible = ref(false)
const previewUrl = ref('')
const previewName = ref('')

const usedPercent = computed(() => {
  const p = vaultStore.profile
  if (!p?.quotaBytes) return 0
  return Math.min(100, Math.round((p.usedBytes / p.quotaBytes) * 100))
})

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

async function loadFiles() {
  await vaultStore.fetchFiles()
  const labels = {}
  for (const file of vaultStore.files) {
    labels[file.id] = await vaultStore.decryptFileLabel(file)
  }
  fileLabels.value = labels
}

onMounted(async () => {
  if (!vaultStore.isUnlocked) {
    router.replace('/secret-room/unlock')
    return
  }
  await vaultStore.fetchProfile()
  await loadFiles()
})

function handleLeave() {
  vaultStore.lock()
  lockSecretRoom()
  router.push('/')
}

function triggerUpload() {
  fileInput.value?.click()
}

async function onFileSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  uploading.value = true
  uploadProgress.value = 0
  const toastId = toastProgress(`上传 ${file.name}`, 0)

  try {
    await vaultStore.uploadFile(file, (pct) => {
      uploadProgress.value = pct
      updateToast(toastId, { message: `上传 ${file.name} ${pct}%`, progress: pct })
    })
    dismiss(toastId)
    toastSuccess('上传完成')
    await loadFiles()
  } catch (err) {
    dismiss(toastId)
    toastError(err.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleDownload(file) {
  try {
    const { name, blob } = await vaultStore.downloadFile(file)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    toastError(err.message || '下载失败')
  }
}

async function handlePreview(file) {
  try {
    const { name, mime, blob } = await vaultStore.downloadFile(file)
    if (mime.startsWith('image/')) {
      if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = URL.createObjectURL(blob)
      previewName.value = name
      previewVisible.value = true
      return
    }
    if (mime !== 'application/pdf' && !mime.startsWith('text/')) {
      toastError('该类型暂不支持预览，请下载')
      return
    }
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (err) {
    toastError(err.message || '预览失败')
  }
}

function closePreview() {
  previewVisible.value = false
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  previewName.value = ''
}

const deleteDialogMessage = computed(() => {
  if (!deleteTarget.value) return ''
  const name = fileLabels.value[deleteTarget.value.id] || '该文件'
  return `确定删除「${name}」吗？\n删除后无法恢复，请谨慎操作。`
})

function openDeleteDialog(file) {
  deleteTarget.value = file
  deleteDialogVisible.value = true
}

function closeDeleteDialog() {
  deleteDialogVisible.value = false
  deleteTarget.value = null
}

async function handleDeleteConfirm() {
  const file = deleteTarget.value
  if (!file) return
  closeDeleteDialog()
  try {
    await vaultStore.removeFile(file.id)
    toastSuccess('已删除')
    await loadFiles()
  } catch (err) {
    toastError(err.message || '删除失败')
  }
}

function handleLock() {
  vaultStore.lock()
  router.replace('/secret-room/unlock')
}
</script>

<template>
  <div class="vault-home">
    <header class="header">
      <div>
        <h1>文件保险库</h1>
        <p class="quota">已用 {{ formatSize(vaultStore.profile?.usedBytes) }} / {{ formatSize(vaultStore.profile?.quotaBytes) }}（{{ usedPercent }}%）</p>
      </div>
      <div class="header-actions">
        <button type="button" class="ghost-btn" @click="handleLock">锁定</button>
        <button type="button" class="ghost-btn" @click="handleLeave">离开</button>
      </div>
    </header>

    <div class="toolbar">
      <button type="button" class="primary-btn" :disabled="uploading" @click="triggerUpload">
        {{ uploading ? `上传中 ${uploadProgress}%` : '上传文件' }}
      </button>
      <input ref="fileInput" type="file" hidden @change="onFileSelected" />
    </div>

    <ul v-if="vaultStore.files.length" class="file-list">
      <li v-for="file in vaultStore.files" :key="file.id" class="file-item">
        <div class="file-info">
          <span class="file-name">{{ fileLabels[file.id] || '…' }}</span>
          <span class="file-meta">{{ formatSize(file.sizePlain) }} · {{ new Date(file.createdAt).toLocaleString() }}</span>
        </div>
        <div class="file-actions">
          <button type="button" class="link-btn" @click="handlePreview(file)">预览</button>
          <button type="button" class="link-btn" @click="handleDownload(file)">下载</button>
          <button type="button" class="link-btn danger" @click="openDeleteDialog(file)">删除</button>
        </div>
      </li>
    </ul>
    <p v-else class="empty">暂无文件，点击上方按钮上传</p>

    <WechatConfirmDialog
      :visible="deleteDialogVisible"
      title="删除文件"
      :message="deleteDialogMessage"
      confirm-text="删除"
      cancel-text="取消"
      danger
      @close="closeDeleteDialog"
      @confirm="handleDeleteConfirm"
    />

    <Teleport to="body">
      <div v-if="previewVisible" class="preview-overlay" @click.self="closePreview">
        <div class="preview-panel">
          <header class="preview-header">
            <span class="preview-title">{{ previewName }}</span>
            <button type="button" class="preview-close" @click="closePreview">关闭</button>
          </header>
          <img :src="previewUrl" :alt="previewName" class="preview-image" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.vault-home {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0 0 4px;
  font-size: 24px;
}

.quota {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.ghost-btn {
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.toolbar {
  margin-bottom: 20px;
}

.primary-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}

.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.file-item:last-child {
  border-bottom: none;
}

.file-name {
  display: block;
  font-weight: 500;
  color: #1e293b;
}

.file-meta {
  font-size: 12px;
  color: #94a3b8;
}

.file-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.link-btn {
  border: none;
  background: none;
  color: #576b95;
  cursor: pointer;
  font-size: 13px;
}

.link-btn.danger {
  color: #dc2626;
}

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 48px 0;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  padding: 16px;
}

.preview-panel {
  width: 100%;
  max-width: 900px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #fff;
}

.preview-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 12px;
}

.preview-close {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: transparent;
  color: #fff;
  cursor: pointer;
}

.preview-image {
  max-width: 100%;
  max-height: calc(100vh - 80px);
  object-fit: contain;
  border-radius: 8px;
}
</style>

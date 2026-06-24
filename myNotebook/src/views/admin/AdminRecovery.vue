<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import * as adminApi from '@/api/admin'
import { toastError, toastSuccess } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()

const requests = ref([])
const loading = ref(false)
const selected = ref(null)
const adminNote = ref('')
const rejectReason = ref('')
const recoveryToken = ref('')

const statusText = {
  pending: '待处理',
  approved: '已批准',
  rejected: '已拒绝',
}

onMounted(async () => {
  if (!userStore.userInfo) {
    await userStore.fetchUserInfo()
  }
  if (!userStore.userInfo?.isAdmin) {
    router.replace('/')
    return
  }
  await loadRequests()
})

async function loadRequests(status) {
  loading.value = true
  try {
    requests.value = await adminApi.listRecoveryRequests(status ? { status } : undefined)
  } catch (err) {
    toastError(err.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(id) {
  selected.value = await adminApi.getRecoveryRequest(id)
  recoveryToken.value = ''
  adminNote.value = ''
  rejectReason.value = ''
}

async function handleApprove() {
  if (!selected.value) return
  try {
    const result = await adminApi.approveRecoveryRequest(selected.value.id, { adminNote: adminNote.value })
    recoveryToken.value = result.recoveryToken
    toastSuccess('已批准，请将恢复令牌安全告知用户')
    await loadRequests()
    selected.value = { ...selected.value, status: 'approved' }
  } catch (err) {
    toastError(err.message || '批准失败')
  }
}

async function handleReject() {
  if (!selected.value || !rejectReason.value.trim()) {
    toastError('请填写拒绝原因')
    return
  }
  try {
    await adminApi.rejectRecoveryRequest(selected.value.id, {
      rejectReason: rejectReason.value,
      adminNote: adminNote.value,
    })
    toastSuccess('已拒绝')
    selected.value = null
    await loadRequests()
  } catch (err) {
    toastError(err.message || '拒绝失败')
  }
}

function copyToken() {
  if (!recoveryToken.value) return
  navigator.clipboard.writeText(recoveryToken.value)
  toastSuccess('已复制恢复令牌')
}
</script>

<template>
  <div class="admin-page">
    <header class="header">
      <h1>保险库恢复审核</h1>
      <button type="button" class="text-btn" @click="router.push('/')">返回首页</button>
    </header>

    <div class="filters">
      <button type="button" @click="loadRequests()">全部</button>
      <button type="button" @click="loadRequests('pending')">待处理</button>
    </div>

    <div class="layout">
      <ul class="request-list">
        <li
          v-for="item in requests"
          :key="item.id"
          :class="{ active: selected?.id === item.id }"
          @click="openDetail(item.id)"
        >
          <span class="user">{{ item.nickname || item.username }}</span>
          <span class="status">{{ statusText[item.status] }}</span>
          <span class="date">{{ new Date(item.createdAt).toLocaleString() }}</span>
        </li>
      </ul>

      <div v-if="selected" class="detail">
        <h2>{{ selected.nickname || selected.username }}</h2>
        <p><strong>说明：</strong>{{ selected.message }}</p>
        <p v-if="selected.contact"><strong>联系：</strong>{{ selected.contact }}</p>
        <p><strong>状态：</strong>{{ statusText[selected.status] }}</p>

        <template v-if="selected.status === 'pending'">
          <label class="field">
            <span>管理员备注（选填）</span>
            <textarea v-model="adminNote" rows="2" />
          </label>
          <div class="actions">
            <button type="button" class="approve-btn" @click="handleApprove">批准</button>
          </div>
          <label class="field">
            <span>拒绝原因</span>
            <textarea v-model="rejectReason" rows="2" />
          </label>
          <button type="button" class="reject-btn" @click="handleReject">拒绝</button>
        </template>

        <div v-if="recoveryToken" class="token-box">
          <p><strong>恢复令牌（仅显示一次，请安全告知用户）：</strong></p>
          <code>{{ recoveryToken }}</code>
          <button type="button" class="copy-btn" @click="copyToken">复制</button>
        </div>
      </div>
      <p v-else class="placeholder">选择左侧申请查看详情</p>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  font-size: 22px;
}

.text-btn {
  border: none;
  background: none;
  color: #576b95;
  cursor: pointer;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filters button {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  min-height: 400px;
}

.request-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.request-list li {
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
}

.request-list li.active {
  background: #eff6ff;
}

.user {
  display: block;
  font-weight: 500;
}

.status {
  font-size: 12px;
  color: #64748b;
}

.date {
  font-size: 11px;
  color: #94a3b8;
}

.detail {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 12px 0;
  font-size: 14px;
}

.field textarea {
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
}

.actions {
  margin: 12px 0;
}

.approve-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #16a34a;
  color: #fff;
  cursor: pointer;
}

.reject-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #dc2626;
  color: #fff;
  cursor: pointer;
}

.token-box {
  margin-top: 16px;
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
}

.token-box code {
  display: block;
  word-break: break-all;
  margin: 8px 0;
  font-size: 12px;
}

.copy-btn {
  padding: 6px 12px;
  border: 1px solid #d97706;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.placeholder {
  color: #94a3b8;
  padding: 24px;
}
</style>

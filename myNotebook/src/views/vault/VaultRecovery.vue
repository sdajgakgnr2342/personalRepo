<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { toastError, toastSuccess } from '@/utils/toast'

import * as vaultApi from '@/api/vault'

const router = useRouter()
const route = useRoute()
const vaultStore = useVaultStore()

const message = ref('')
const contact = ref('')
const loading = ref(false)
const requests = ref([])

onMounted(async () => {
  await vaultStore.fetchProfile()
  try {
    requests.value = await vaultApi.listMyRecoveryRequests()
  } catch {
    requests.value = []
  }
})

async function handleSubmit() {
  if (!message.value.trim()) {
    toastError('请填写申请说明')
    return
  }
  loading.value = true
  try {
    await vaultStore.submitRecoveryRequest(message.value.trim(), contact.value.trim() || undefined)
    toastSuccess('申请已提交，请等待管理员处理')
    message.value = ''
    requests.value = await vaultApi.listMyRecoveryRequests()
  } catch (err) {
    toastError(err.message || '提交失败')
  } finally {
    loading.value = false
  }
}

const statusText = {
  pending: '待处理',
  approved: '已批准',
  rejected: '已拒绝',
}
</script>

<template>
  <div class="vault-page">
    <header class="page-header">
      <h1>密码恢复申请</h1>
      <button type="button" class="text-btn" @click="router.push(route.meta.backTo || '/secret-room')">返回</button>
    </header>

    <div class="notice">
      <p>忘记保险柜密码时，可提交申请由管理员人工核实后恢复。恢复后您需使用管理员提供的<strong>恢复令牌</strong>设置新密码，原有加密文件不会丢失。</p>
    </div>

    <form v-if="!vaultStore.profile?.hasPendingRecoveryRequest" class="form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>申请说明</span>
        <textarea v-model="message" rows="4" placeholder="请说明身份验证信息、注册时间等" required />
      </label>
      <label class="field">
        <span>联系方式（选填）</span>
        <input v-model="contact" type="text" placeholder="邮箱或其他联系方式" />
      </label>
      <button type="submit" class="primary-btn" :disabled="loading">
        {{ loading ? '提交中…' : '提交申请' }}
      </button>
    </form>
    <p v-else class="pending-tip">您已有待处理的恢复申请，请耐心等待。</p>

    <section v-if="requests.length" class="history">
      <h2>申请记录</h2>
      <ul>
        <li v-for="item in requests" :key="item.id">
          <span class="status" :data-status="item.status">{{ statusText[item.status] || item.status }}</span>
          <span class="date">{{ new Date(item.createdAt).toLocaleString() }}</span>
          <p v-if="item.rejectReason" class="reject">拒绝原因：{{ item.rejectReason }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.vault-page {
  max-width: 560px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
}

.text-btn {
  border: none;
  background: none;
  color: #576b95;
  cursor: pointer;
}

.notice {
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.field textarea,
.field input {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: inherit;
}

.primary-btn {
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}

.pending-tip {
  color: #92400e;
  background: #fffbeb;
  padding: 12px;
  border-radius: 8px;
}

.history {
  margin-top: 32px;
}

.history h2 {
  font-size: 16px;
  margin: 0 0 12px;
}

.history ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history li {
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.status[data-status='pending'] { color: #d97706; }
.status[data-status='approved'] { color: #16a34a; }
.status[data-status='rejected'] { color: #dc2626; }

.date {
  margin-left: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.reject {
  margin: 6px 0 0;
  font-size: 13px;
  color: #64748b;
}
</style>

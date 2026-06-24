<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { toastError, toastSuccess } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const vaultStore = useVaultStore()

const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  loading.value = true
  try {
    await vaultStore.setupVault(password.value, confirmPassword.value)
    toastSuccess('保险库已开通')
    router.replace(route.meta.backTo || '/secret-room/vault')
  } catch (err) {
    errorMsg.value = err.message || '开通失败'
    toastError(errorMsg.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="vault-page">
    <header class="page-header">
      <h1>开通文件保险库</h1>
      <button type="button" class="text-btn" @click="router.push(route.meta.backTo || '/secret-room')">返回</button>
    </header>

    <div class="notice">
      <p class="notice-title">独立保险柜密码</p>
      <p class="notice-desc">
        保险柜密码与登录密码、计算器暗号<strong>完全独立</strong>。文件在本地加密后上传，服务端仅存储密文。
        单文件最大 1GB，请牢记密码；忘记密码需联系管理员人工恢复。
      </p>
    </div>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>保险柜密码</span>
        <input v-model="password" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <label class="field">
        <span>确认密码</span>
        <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button type="submit" class="primary-btn" :disabled="loading">
        {{ loading ? '正在开通…' : '开通保险库' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.vault-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  color: #1e293b;
}

.text-btn {
  border: none;
  background: none;
  color: #576b95;
  cursor: pointer;
  font-size: 15px;
}

.notice {
  margin-bottom: 24px;
  padding: 14px 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
}

.notice-title {
  margin: 0 0 8px;
  font-weight: 600;
  color: #1e40af;
}

.notice-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #1e3a8a;
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
  color: #475569;
}

.field input {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
}

.error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
}

.primary-btn {
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

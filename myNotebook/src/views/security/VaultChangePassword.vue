<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { toastError, toastSuccess } from '@/utils/toast'

const router = useRouter()
const vaultStore = useVaultStore()

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  loading.value = true
  try {
    await vaultStore.changeVaultPassword(oldPassword.value, newPassword.value, confirmPassword.value)
    toastSuccess('保险库密码已修改，请重新解锁')
    router.replace('/security-manage/vault')
  } catch (err) {
    errorMsg.value = err.message || '修改失败'
    toastError(errorMsg.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>修改保险库密码</h1>
      <button type="button" class="back-link" @click="router.push('/security-manage/vault')">返回</button>
    </header>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>当前密码</span>
        <input v-model="oldPassword" type="password" autocomplete="current-password" required />
      </label>
      <label class="field">
        <span>新密码</span>
        <input v-model="newPassword" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <label class="field">
        <span>确认新密码</span>
        <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button type="submit" class="primary-btn" :disabled="loading">
        {{ loading ? '保存中…' : '确认修改' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 32px 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 22px;
}

.back-link {
  border: none;
  background: none;
  color: #576b95;
  cursor: pointer;
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

.field input {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
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
  cursor: pointer;
}
</style>

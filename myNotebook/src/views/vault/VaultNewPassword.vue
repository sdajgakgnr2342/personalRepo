<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { toastError, toastSuccess } from '@/utils/toast'

const router = useRouter()
const route = useRoute()
const vaultStore = useVaultStore()

const recoveryToken = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const bootstrap = ref(null)

onMounted(async () => {
  await vaultStore.fetchProfile()
  if (!vaultStore.needsNewPassword && !vaultStore.profile?.canSetNewPassword) {
    router.replace('/secret-room')
    return
  }
  const vaultApi = await import('@/api/vault')
  bootstrap.value = await vaultApi.getRecoveryBootstrap()
})

async function handleSubmit() {
  loading.value = true
  try {
    await vaultStore.completeNewPassword(recoveryToken.value.trim(), password.value, confirmPassword.value)
    toastSuccess('新密码已生效')
    router.replace(route.path.startsWith('/security-manage') ? '/security-manage/vault' : '/secret-room/vault')
  } catch (err) {
    toastError(err.message || '设置失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="vault-page">
    <header class="page-header">
      <h1>设置新保险柜密码</h1>
      <button type="button" class="text-btn" @click="router.push(route.meta.backTo || '/secret-room')">返回</button>
    </header>

    <div class="notice">
      <p>管理员已批准您的恢复申请。请输入管理员告知的<strong>恢复令牌</strong>，并设置新的保险柜密码。</p>
      <p v-if="bootstrap?.expiresAt" class="expire">令牌有效期至：{{ new Date(bootstrap.expiresAt).toLocaleString() }}</p>
    </div>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>恢复令牌</span>
        <input v-model="recoveryToken" type="text" autocomplete="off" required />
      </label>
      <label class="field">
        <span>新密码</span>
        <input v-model="password" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <label class="field">
        <span>确认新密码</span>
        <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <button type="submit" class="primary-btn" :disabled="loading">
        {{ loading ? '保存中…' : '确认设置' }}
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
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
}

.expire {
  margin: 8px 0 0;
  color: #047857;
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

.primary-btn {
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
</style>

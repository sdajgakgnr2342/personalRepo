<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVaultStore } from '@/stores/vault'
import { getWebCryptoUnavailableMessage, isWebCryptoAvailable } from '@/crypto/vault'
import { toastError, toastSuccess } from '@/utils/toast'

const router = useRouter()
const vaultStore = useVaultStore()

const password = ref('')
const loading = ref(false)
const errorMsg = ref('')
const cryptoBlocked = ref(false)
const cryptoHint = ref('')

onMounted(() => {
  if (!isWebCryptoAvailable()) {
    cryptoBlocked.value = true
    cryptoHint.value = getWebCryptoUnavailableMessage()
    errorMsg.value = cryptoHint.value
  }
})

async function handleSubmit() {
  if (cryptoBlocked.value) return
  errorMsg.value = ''
  loading.value = true
  try {
    await vaultStore.unlock(password.value)
    toastSuccess('已解锁')
    router.replace('/secret-room/vault')
  } catch (err) {
    errorMsg.value = err.message || '解锁失败'
    toastError(errorMsg.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="vault-page">
    <header class="page-header">
      <h1>解锁保险库</h1>
      <button type="button" class="text-btn" @click="router.push('/secret-room')">返回</button>
    </header>

    <div v-if="cryptoBlocked" class="crypto-warn">
      {{ cryptoHint }}
    </div>

    <form class="form" @submit.prevent="handleSubmit">
      <label class="field">
        <span>保险柜密码</span>
        <input v-model="password" type="password" autocomplete="current-password" :disabled="cryptoBlocked" required />
      </label>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button type="submit" class="primary-btn" :disabled="loading || cryptoBlocked">
        {{ loading ? '验证中…' : '解锁' }}
      </button>
    </form>

    <p class="footer-link">
      <router-link to="/secret-room/recovery">忘记密码？申请恢复</router-link>
    </p>
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
  margin-bottom: 24px;
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

.crypto-warn {
  margin-bottom: 16px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
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

.footer-link {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
}

.footer-link a {
  color: #576b95;
}
</style>

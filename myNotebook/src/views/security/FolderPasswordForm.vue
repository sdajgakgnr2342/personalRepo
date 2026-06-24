<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { changeFolderPassword, resetFolderPasswordForgotten, listEncryptedFolders } from '@/api/item'
import { toastError, toastSuccess } from '@/utils/toast'

const route = useRoute()
const router = useRouter()

const folderName = ref('')
const mode = ref('change')
const oldPassword = ref('')
const loginPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

const folderId = computed(() => Number(route.params.id))

onMounted(async () => {
  try {
    const folders = await listEncryptedFolders()
    const folder = folders.find((f) => f.id === folderId.value)
    folderName.value = folder?.name || '加密文件夹'
  } catch {
    folderName.value = '加密文件夹'
  }
})

async function handleSubmit() {
  errorMsg.value = ''
  if (newPassword.value.length < 6) {
    errorMsg.value = '新密码至少 6 位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次新密码不一致'
    return
  }

  loading.value = true
  try {
    if (mode.value === 'change') {
      await changeFolderPassword(folderId.value, {
        oldPassword: oldPassword.value,
        newPassword: newPassword.value,
      })
    } else {
      await resetFolderPasswordForgotten(folderId.value, {
        loginPassword: loginPassword.value,
        newPassword: newPassword.value,
      })
    }
    toastSuccess('文件夹密码已更新')
    router.replace('/security-manage/folders')
  } catch (err) {
    errorMsg.value = err.message || '操作失败'
    toastError(errorMsg.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>{{ folderName }}</h1>
        <p class="subtitle">管理文件夹密码</p>
      </div>
      <button type="button" class="back-link" @click="router.push('/security-manage/folders')">返回</button>
    </header>

    <div class="tabs">
      <button type="button" :class="{ active: mode === 'change' }" @click="mode = 'change'">记得密码</button>
      <button type="button" :class="{ active: mode === 'forgot' }" @click="mode = 'forgot'">忘记密码</button>
    </div>

    <form class="form" @submit.prevent="handleSubmit">
      <label v-if="mode === 'change'" class="field">
        <span>当前文件夹密码</span>
        <input v-model="oldPassword" type="password" required />
      </label>
      <label v-else class="field">
        <span>登录密码（验证身份）</span>
        <input v-model="loginPassword" type="password" autocomplete="current-password" required />
      </label>
      <label class="field">
        <span>新密码</span>
        <input v-model="newPassword" type="password" autocomplete="new-password" minlength="6" required />
      </label>
      <label class="field">
        <span>确认新密码</span>
        <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="6" required />
      </label>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <button type="submit" class="primary-btn" :disabled="loading">
        {{ loading ? '保存中…' : '确认' }}
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
  align-items: flex-start;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  font-size: 22px;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
}

.back-link {
  border: none;
  background: none;
  color: #576b95;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.tabs button {
  flex: 1;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.tabs button.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
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

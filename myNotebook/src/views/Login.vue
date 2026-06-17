<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const errorMsg = ref('')
const isRegister = ref(false)
const form = reactive({
  username: '',
  password: '',
  nickname: '',
})

async function handleSubmit() {
  if (!form.username || !form.password) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    if (isRegister.value) {
      await userStore.register(form)
    } else {
      await userStore.login(form)
    }
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (err) {
    errorMsg.value = err.message || '操作失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="handleSubmit">
      <h1>{{ isRegister ? '注册' : '登录' }}</h1>

      <label v-if="isRegister">
        昵称
        <input v-model="form.nickname" type="text" placeholder="可选" />
      </label>

      <label>
        用户名
        <input v-model="form.username" type="text" placeholder="请输入用户名" />
      </label>

      <label>
        密码
        <input v-model="form.password" type="password" placeholder="请输入密码" />
      </label>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

      <button type="submit" :disabled="loading">
        {{ loading ? '处理中...' : (isRegister ? '注册' : '登录') }}
      </button>

      <button type="button" class="switch-btn" @click="isRegister = !isRegister">
        {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f8fafc;
}

.login-form {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.login-form h1 {
  margin: 0 0 4px;
  text-align: center;
  font-size: 22px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: #64748b;
}

input {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

input:focus {
  border-color: #2563eb;
}

button[type="submit"] {
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-btn {
  padding: 8px;
  border: none;
  background: none;
  color: #2563eb;
  font-size: 14px;
  cursor: pointer;
}

.error {
  color: #ef4444;
  font-size: 14px;
  margin: 0;
}
</style>

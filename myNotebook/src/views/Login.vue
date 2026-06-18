<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import AppIcon from '@/components/AppIcon.vue'

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

function setMode(register) {
  isRegister.value = register
  errorMsg.value = ''
}
</script>

<template>
  <div class="login-page">
    <div class="login-sheet">
      <header class="sheet-head">
        <AppIcon name="logo" :size="22" alt="" />
        <span class="sheet-title">myNotebook</span>
      </header>

      <div class="mode-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="mode-tab"
          :class="{ active: !isRegister }"
          :aria-selected="!isRegister"
          @click="setMode(false)"
        >
          登录
        </button>
        <button
          type="button"
          role="tab"
          class="mode-tab"
          :class="{ active: isRegister }"
          :aria-selected="isRegister"
          @click="setMode(true)"
        >
          注册
        </button>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <div v-if="isRegister" class="field">
          <input
            id="nickname"
            v-model="form.nickname"
            type="text"
            placeholder="昵称（可不填）"
            autocomplete="nickname"
            aria-label="昵称"
          />
        </div>

        <div class="field">
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="用户名"
            autocomplete="username"
            aria-label="用户名"
            required
          />
        </div>

        <div class="field">
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="密码"
            autocomplete="current-password"
            aria-label="密码"
            required
          />
        </div>

        <p v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '请稍候…' : (isRegister ? '注册' : '登录') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/*
 * 登录：整页同色，表单居中，无卡片容器。
 */
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px 26vh;
  padding-top: max(20px, env(safe-area-inset-top));
  box-sizing: border-box;
  background: #fff;
}

.login-sheet {
  width: 100%;
  max-width: 320px;
  padding: 0;
  background: transparent;
  border: none;
}

.sheet-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.sheet-title {
  font-size: 15px;
  font-weight: 600;
  color: #191919;
  letter-spacing: 0.02em;
}

.mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e5e5;
}

.mode-tab {
  flex: 1;
  padding: 0 0 8px;
  border: none;
  background: none;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  position: relative;
}

.mode-tab.active {
  color: #191919;
  font-weight: 600;
}

.mode-tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: #191919;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field input {
  width: 100%;
  padding: 6px 0;
  border: none;
  border-bottom: 1px solid #ddd;
  border-radius: 0;
  font-size: 14px;
  color: #191919;
  background: transparent;
  outline: none;
  box-sizing: border-box;
}

.field input::placeholder {
  color: #bbb;
}

.field input:focus {
  border-bottom-color: #191919;
}

.error-msg {
  margin: -4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #c0392b;
}

.submit-btn {
  margin-top: 4px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #191919;
  background: #191919;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
}

.submit-btn:hover:not(:disabled) {
  background: #333;
  border-color: #333;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* PC */
@media (min-width: 768px) {
  .login-sheet {
    max-width: 340px;
  }
}

@media (max-width: 420px) {
  .login-page {
    padding: 16px 16px 22vh;
    padding-top: max(16px, env(safe-area-inset-top));
  }

  .login-sheet {
    max-width: 300px;
  }
}
</style>

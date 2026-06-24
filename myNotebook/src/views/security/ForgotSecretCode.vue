<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { resetSecretCodeByLogin } from '@/api/auth'
import { useCalculator } from '@/composables/useCalculator'
import CalculatorPad from '@/components/calculator/CalculatorPad.vue'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const loginPassword = ref('')
const firstCode = ref('')
const errorMsg = ref('')
const loading = ref(false)

const stepHint = {
  1: '请输入登录密码验证身份',
  2: '请设置新暗号',
  3: '请再次输入新暗号确认',
}

async function handleLoginSubmit() {
  if (!loginPassword.value) {
    errorMsg.value = '请输入登录密码'
    return
  }
  errorMsg.value = ''
  step.value = 2
}

function handleSubmit(code) {
  if (step.value === 1) return

  if (!code || code === '0') {
    errorMsg.value = '暗号不能为空'
    return
  }
  errorMsg.value = ''

  if (step.value === 2) {
    firstCode.value = code
    step.value = 3
    clearAll()
    return
  }

  if (code !== firstCode.value) {
    errorMsg.value = '两次输入不一致，请重新设置'
    step.value = 2
    firstCode.value = ''
    clearAll()
    return
  }

  submitReset(code)
}

async function submitReset(code) {
  loading.value = true
  errorMsg.value = ''
  try {
    userStore.userInfo = await resetSecretCodeByLogin({
      loginPassword: loginPassword.value,
      code,
      confirmCode: code,
    })
    router.replace('/security-manage')
  } catch (err) {
    errorMsg.value = err.message || '重置失败'
    if (err.message?.includes('登录密码')) {
      step.value = 1
    } else {
      step.value = 2
      firstCode.value = ''
      clearAll()
    }
  } finally {
    loading.value = false
  }
}

const {
  operator,
  displayText,
  fullExpression,
  pressedLabel,
  buttons,
  handleButtonClick,
  clearAll,
} = useCalculator({ onSingleSubmit: handleSubmit })
</script>

<template>
  <div class="page">
    <header class="header">
      <div>
        <h1>忘记暗号 · 重置</h1>
        <p class="step-label">步骤 {{ step }} / 3</p>
      </div>
      <button type="button" class="back-link" @click="router.push('/security-manage/secret-code')">返回</button>
    </header>

    <div v-if="step === 1" class="form-block">
      <p class="notice-desc">验证登录密码后，可重新设置计算器暗号。</p>
      <label class="field">
        <span>登录密码</span>
        <input v-model="loginPassword" type="password" autocomplete="current-password" />
      </label>
      <button type="button" class="primary-btn" @click="handleLoginSubmit">下一步</button>
    </div>

    <template v-else>
      <div class="notice">
        <p class="notice-title">{{ stepHint[step] }}</p>
        <p class="notice-desc">通过计算器按键输入，完成后按 <strong>=</strong> 确认。</p>
      </div>
      <CalculatorPad
        :display-text="displayText"
        :full-expression="fullExpression"
        :buttons="buttons"
        :pressed-label="pressedLabel"
        :active-operator="operator"
        @button-click="handleButtonClick"
      />
    </template>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    <p v-if="loading" class="loading-tip">正在保存…</p>
  </div>
</template>

<style scoped>
.page {
  max-width: 360px;
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
  margin: 0 0 4px;
  font-size: 22px;
}

.step-label {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.back-link {
  border: none;
  background: none;
  color: #576b95;
  cursor: pointer;
}

.form-block {
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

.notice {
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
}

.notice-title {
  margin: 0 0 8px;
  font-weight: 600;
  color: #92400e;
}

.notice-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #78350f;
}

.error-msg {
  margin-top: 16px;
  color: #dc2626;
  font-size: 13px;
}

.loading-tip {
  margin-top: 16px;
  text-align: center;
  color: #64748b;
}
</style>

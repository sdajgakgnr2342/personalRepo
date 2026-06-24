<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useCalculator } from '@/composables/useCalculator'
import CalculatorPad from '@/components/calculator/CalculatorPad.vue'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const firstCode = ref('')
const errorMsg = ref('')
const loading = ref(false)

const stepHint = {
  1: '请设置你的暗号',
  2: '请再次输入暗号确认',
}

function handleSubmit(code) {
  if (!code || code === '0') {
    errorMsg.value = '暗号不能为空'
    return
  }

  errorMsg.value = ''

  if (step.value === 1) {
    firstCode.value = code
    step.value = 2
    clearAll()
    return
  }

  if (code !== firstCode.value) {
    errorMsg.value = '两次输入不一致，请重新设置'
    step.value = 1
    firstCode.value = ''
    clearAll()
    return
  }

  submitCode(code)
}

async function submitCode(code) {
  loading.value = true
  errorMsg.value = ''
  try {
    await userStore.setSecretCode({ code, confirmCode: code })
    router.replace('/calculator')
  } catch (err) {
    errorMsg.value = err.message || '设置失败，请重试'
    step.value = 1
    firstCode.value = ''
    clearAll()
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
  <div class="setup-page">
    <header class="setup-header">
      <div>
        <h1>设置暗号</h1>
        <p class="step-label">步骤 {{ step }} / 2</p>
      </div>
      <button type="button" class="back-link" @click="router.push('/')">返回</button>
    </header>

    <div class="notice">
      <p class="notice-title">{{ stepHint[step] }}</p>
      <p class="notice-desc">
        请通过下方计算器按键输入暗号，输入完成后按 <strong>=</strong> 确认。
        此暗号将作为隐藏入口密码，<strong>请务必牢记</strong>，遗失后无法找回。
      </p>
    </div>

    <p v-if="errorMsg" class="error-msg" role="alert">{{ errorMsg }}</p>

    <CalculatorPad
      :display-text="displayText"
      :full-expression="fullExpression"
      :buttons="buttons"
      :pressed-label="pressedLabel"
      :active-operator="operator"
      @button-click="handleButtonClick"
    />

    <p v-if="loading" class="loading-tip">正在保存…</p>
  </div>
</template>

<style scoped>
.setup-page {
  max-width: 360px;
  margin: 0 auto;
  padding: 32px 24px;
}

.setup-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.setup-header h1 {
  margin: 0 0 4px;
  font-size: 22px;
  color: #1e293b;
}

.back-link {
  padding: 0;
  border: none;
  background: none;
  color: #576b95;
  font-size: 15px;
  cursor: pointer;
  flex-shrink: 0;
}

.back-link:hover {
  opacity: 0.85;
}

.step-label {
  margin: 0;
  font-size: 13px;
  color: #64748b;
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
  font-size: 15px;
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
  margin: 0 0 16px;
  font-size: 13px;
  color: #dc2626;
}

.loading-tip {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: #64748b;
}
</style>

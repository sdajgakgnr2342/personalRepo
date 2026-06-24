<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { verifySecretCode } from '@/api/auth'
import { useCalculator } from '@/composables/useCalculator'
import CalculatorPad from '@/components/calculator/CalculatorPad.vue'

const router = useRouter()
const userStore = useUserStore()

const step = ref(1)
const oldCode = ref('')
const firstCode = ref('')
const errorMsg = ref('')
const loading = ref(false)

const stepHint = {
  1: '请输入当前暗号',
  2: '请设置新暗号',
  3: '请再次输入新暗号确认',
}

async function handleSubmit(code) {
  if (!code || code === '0') {
    errorMsg.value = '暗号不能为空'
    return
  }

  errorMsg.value = ''

  if (step.value === 1) {
    loading.value = true
    try {
      const data = await verifySecretCode({ code })
      if (!data?.valid) {
        errorMsg.value = '当前暗号错误'
        clearAll()
        return
      }
      oldCode.value = code
      step.value = 2
      clearAll()
    } catch (err) {
      errorMsg.value = err.message || '验证失败，请重试'
      clearAll()
    } finally {
      loading.value = false
    }
    return
  }

  if (step.value === 2) {
    if (code === oldCode.value) {
      errorMsg.value = '新暗号不能与当前暗号相同'
      clearAll()
      return
    }
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
    await userStore.resetSecretCode({
      oldCode: oldCode.value,
      code,
      confirmCode: code,
    })
    router.replace('/security-manage')
  } catch (err) {
    errorMsg.value = err.message || '重置失败，请重试'
    step.value = 1
    oldCode.value = ''
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
        <h1>重置暗号</h1>
        <p class="step-label">步骤 {{ step }} / 3</p>
      </div>
      <button type="button" class="back-link" @click="router.push('/security-manage')">返回</button>
    </header>

    <div class="notice">
      <p class="notice-title">{{ stepHint[step] }}</p>
      <p class="notice-desc">
        请通过下方计算器按键输入，输入完成后按 <strong>=</strong> 确认。
        重置后请使用新暗号进入隐藏空间，<strong>请务必牢记</strong>。
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

    <p v-if="loading" class="loading-tip">正在处理…</p>
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

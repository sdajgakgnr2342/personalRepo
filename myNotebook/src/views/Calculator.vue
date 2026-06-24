<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { verifySecretCode } from '@/api/auth'
import { unlockSecretRoom } from '@/utils/secretRoom'
import { useCalculator } from '@/composables/useCalculator'
import CalculatorPad from '@/components/calculator/CalculatorPad.vue'

const router = useRouter()
const verifying = ref(false)

async function tryUnlock(code) {
  if (verifying.value) return
  verifying.value = true
  try {
    const data = await verifySecretCode({ code })
    if (data?.valid) {
      unlockSecretRoom()
      router.push('/secret-room')
    }
  } catch {
    /* 验证失败时保持计算器外观，不做提示 */
  } finally {
    verifying.value = false
  }
}

const {
  operator,
  displayText,
  fullExpression,
  pressedLabel,
  buttons,
  handleButtonClick,
} = useCalculator({ onSingleSubmit: tryUnlock })
</script>

<template>
  <div class="calculator-page">
    <div class="page-header">
      <h1>计算器</h1>
      <button type="button" class="back-link" @click="router.push('/')">返回</button>
    </div>

    <CalculatorPad
      :display-text="displayText"
      :full-expression="fullExpression"
      :buttons="buttons"
      :pressed-label="pressedLabel"
      :active-operator="operator"
      @button-click="handleButtonClick"
    />
  </div>
</template>

<style scoped>
.calculator-page {
  max-width: 360px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
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

h1 {
  margin: 0;
  font-size: 22px;
  color: #1e293b;
}
</style>

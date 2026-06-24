<script setup>
defineProps({
  displayText: { type: String, required: true },
  fullExpression: { type: String, default: '' },
  buttons: { type: Array, required: true },
  pressedLabel: { type: String, default: null },
  activeOperator: { type: String, default: null },
})

const emit = defineEmits(['button-click'])
</script>

<template>
  <div class="calculator">
    <div class="display-wrap">
      <div class="expression" :class="{ visible: fullExpression }">
        {{ fullExpression || '\u00a0' }}
      </div>
      <div class="display" aria-live="polite">{{ displayText }}</div>
    </div>
    <div class="keypad">
      <button
        v-for="btn in buttons"
        :key="btn.label"
        type="button"
        class="key"
        :class="[
          btn.class,
          {
            pressed: pressedLabel === btn.label,
            'op-active': btn.operator && activeOperator === btn.operator,
          },
        ]"
        @click="emit('button-click', btn)"
      >
        {{ btn.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.calculator {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.display-wrap {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 10px;
}

.expression {
  min-height: 20px;
  margin-bottom: 4px;
  font-size: 15px;
  text-align: right;
  color: #64748b;
  opacity: 0;
  transition: opacity 0.15s;
}

.expression.visible {
  opacity: 1;
}

.display {
  min-height: 40px;
  font-size: 32px;
  font-weight: 500;
  text-align: right;
  color: #1e293b;
  word-break: break-all;
  line-height: 1.2;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.key {
  height: 52px;
  border: none;
  border-radius: 10px;
  background: #f1f5f9;
  color: #1e293b;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.12s, transform 0.1s, box-shadow 0.12s;
}

.key:hover {
  background: #e2e8f0;
}

.key:active,
.key.pressed {
  transform: scale(0.94);
}

.key.fn {
  background: #e2e8f0;
  color: #475569;
}

.key.fn.pressed {
  background: #cbd5e1;
}

.key.op {
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 22px;
}

.key.op.pressed {
  background: #93c5fd;
}

.key.op.op-active {
  background: #2563eb;
  color: #fff;
  box-shadow: inset 0 0 0 2px #1d4ed8;
}

.key.op.op-active.pressed {
  background: #1d4ed8;
}

.key.op.equals {
  background: #2563eb;
  color: #fff;
}

.key.op.equals:hover {
  background: #1d4ed8;
}

.key.op.equals.pressed {
  background: #1e40af;
}

.key.wide-half {
  grid-column: span 1;
}
</style>

<script setup>
import { useToastState, dismiss } from '@/utils/toast'

const state = useToastState()
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="item in state.toasts"
        :key="item.id"
        class="toast-item"
        :class="item.type"
        @click="dismiss(item.id)"
      >
        <span class="toast-icon">
          {{ item.type === 'success' ? '✓' : item.type === 'error' ? '✕' : item.type === 'warning' ? '!' : 'ℹ' }}
        </span>
        <span class="toast-message">{{ item.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 64px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: min(420px, calc(100vw - 32px));
}

.toast-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  font-size: 14px;
  line-height: 1.5;
  color: #374151;
  pointer-events: auto;
  cursor: pointer;
}

.toast-item.success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.toast-item.error {
  border-color: #fecaca;
  background: #fef2f2;
}

.toast-item.warning {
  border-color: #fed7aa;
  background: #fff7ed;
}

.toast-item.info {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: bold;
}

.success .toast-icon {
  background: #22c55e;
  color: #fff;
}

.error .toast-icon {
  background: #ef4444;
  color: #fff;
}

.warning .toast-icon {
  background: #f59e0b;
  color: #fff;
}

.info .toast-icon {
  background: #3b82f6;
  color: #fff;
}

.toast-message {
  flex: 1;
  word-break: break-word;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (max-width: 768px) {
  .toast-container {
    top: auto;
    bottom: 16px;
    left: 16px;
    right: 16px;
    max-width: none;
  }
}
</style>

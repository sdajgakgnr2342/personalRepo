<script setup>
import { useToastState, dismiss } from '@/utils/toast'
import AppIcon from '@/components/AppIcon.vue'

const state = useToastState()

const toastIconMap = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
}
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast">
      <div
        v-for="item in state.toasts"
        :key="item.id"
        class="toast-item"
        :class="item.type"
        @click="item.type !== 'progress' && dismiss(item.id)"
      >
        <AppIcon
          v-if="item.type !== 'progress'"
          :name="toastIconMap[item.type] || 'info'"
          :size="20"
          class="toast-icon"
          alt=""
        />
        <div class="toast-body">
          <span class="toast-message">{{ item.message }}</span>
          <div v-if="item.type === 'progress'" class="toast-progress-wrap">
            <div class="toast-progress-track">
              <div
                class="toast-progress-bar"
                :class="{ indeterminate: item.progress < 0 }"
                :style="item.progress >= 0 ? { width: `${item.progress}%` } : undefined"
              />
            </div>
            <span v-if="item.progress >= 0" class="toast-progress-text">{{ item.progress }}%</span>
          </div>
        </div>
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
  margin-top: 1px;
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-message {
  display: block;
  word-break: break-word;
}

.toast-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.toast-progress-track {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  background: #3b82f6;
  border-radius: 999px;
  transition: width 0.2s ease;
}

.toast-progress-bar.indeterminate {
  width: 40% !important;
  animation: toast-progress-indeterminate 1.2s ease-in-out infinite;
}

.toast-progress-text {
  flex-shrink: 0;
  font-size: 12px;
  color: #6b7280;
  min-width: 36px;
  text-align: right;
}

@keyframes toast-progress-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
}

.toast-item.progress {
  border-color: #bfdbfe;
  background: #eff6ff;
  cursor: default;
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
    top: 10%;
    bottom: auto;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    align-items: center;
    width: calc(100% - 32px);
    max-width: min(420px, calc(100vw - 32px));
  }

  .toast-enter-from,
  .toast-leave-to {
    transform: translateY(-12px);
  }
}
</style>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  danger: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="wechat-dialog-overlay" @click.self="emit('close')">
      <div class="wechat-dialog" role="dialog" aria-modal="true">
        <div class="wechat-dialog-body">
          <p v-if="title" class="wechat-dialog-title">{{ title }}</p>
          <p class="wechat-dialog-message">{{ message }}</p>
        </div>
        <div class="wechat-dialog-actions">
          <button type="button" class="wechat-btn cancel" @click="emit('close')">
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="wechat-btn confirm"
            :class="{ danger }"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.wechat-dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 6000;
  padding: 24px;
}

.wechat-dialog {
  width: 100%;
  max-width: 300px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.wechat-dialog-body {
  padding: 28px 24px 24px;
  text-align: center;
}

.wechat-dialog-title {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  color: #191919;
}

.wechat-dialog-message {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: #888;
  white-space: pre-line;
}

.wechat-dialog-actions {
  display: flex;
  border-top: 1px solid #e5e5e5;
}

.wechat-btn {
  flex: 1;
  height: 48px;
  border: none;
  background: #fff;
  font-size: 17px;
  line-height: 48px;
  cursor: pointer;
  transition: background 0.15s;
}

.wechat-btn:active {
  background: #f2f2f2;
}

.wechat-btn.cancel {
  color: #191919;
  border-right: 1px solid #e5e5e5;
}

.wechat-btn.confirm {
  color: #576b95;
  font-weight: 500;
}

.wechat-btn.confirm.danger {
  color: #fa5151;
}
</style>

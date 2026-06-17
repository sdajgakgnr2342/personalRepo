<script setup>
import { ref } from 'vue'
import { unlockFolder } from '@/api/item'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  folderId: { type: Number, required: true },
  folderName: { type: String, default: '' },
  unlockMinutes: { type: Number, default: 5 },
})

const emit = defineEmits(['unlocked', 'close'])
const password = ref('')
const loading = ref(false)
const error = ref('')

function handleClose() {
  if (loading.value) return
  password.value = ''
  error.value = ''
  emit('close')
}

async function handleUnlock() {
  if (!password.value) {
    error.value = '请输入密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const result = await unlockFolder(props.folderId, password.value)
    password.value = ''
    emit('unlocked', { unlockMinutes: result?.unlockMinutes ?? props.unlockMinutes })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="unlock-overlay" @click.self="handleClose">
      <div class="unlock-dialog">
      <div class="dialog-header">
        <h3><AppIcon name="lock" :size="20" alt="" /> 加密文件夹</h3>
        <button type="button" class="close-btn" title="关闭" @click="handleClose">
          <AppIcon name="close" :size="16" alt="关闭" />
        </button>
      </div>
      <p>「{{ folderName }}」需要密码才能访问</p>
      <p class="hint">解锁后 {{ unlockMinutes }} 分钟内再次查看无需重复输入密码</p>
      <input
        v-model="password"
        type="password"
        placeholder="请输入文件夹密码"
        @keyup.enter="handleUnlock"
        @keyup.esc="handleClose"
      />
      <p v-if="error" class="error">{{ error }}</p>
      <div class="actions">
        <button type="button" class="btn-cancel" :disabled="loading" @click="handleClose">取消</button>
        <button type="button" class="btn-confirm" :disabled="loading" @click="handleUnlock">
          {{ loading ? '验证中...' : '解锁' }}
        </button>
      </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.unlock-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 6000;
  padding: 24px;
  box-sizing: border-box;
}

.unlock-dialog {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  width: 100%;
  max-width: 300px;
  box-sizing: border-box;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dialog-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #64748b;
}

.unlock-dialog p {
  color: #64748b;
  font-size: 14px;
  margin: 0 0 8px;
}

.hint {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 16px !important;
}

.unlock-dialog input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.unlock-dialog input:focus {
  outline: none;
  border-color: #2563eb;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.btn-cancel,
.btn-confirm {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #64748b;
}

.btn-cancel:hover:not(:disabled) {
  border-color: #cbd5e1;
}

.btn-confirm {
  border: none;
  background: #2563eb;
  color: #fff;
}

.btn-confirm:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #ef4444;
  font-size: 13px;
  margin: 0 0 8px;
}
</style>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'folder' },
})

const emit = defineEmits(['close', 'confirm'])

const name = ref('')
const isEncrypted = ref(false)
const password = ref('')
const error = ref('')
const nameInputRef = ref(null)

watch(() => props.visible, async (val) => {
  if (val) {
    name.value = props.type === 'note' ? '未命名笔记' : ''
    isEncrypted.value = false
    password.value = ''
    error.value = ''
    await nextTick()
    nameInputRef.value?.focus()
    if (props.type === 'note') nameInputRef.value?.select()
  }
})

function handleClose() {
  emit('close')
}

function handleConfirm() {
  if (!name.value.trim()) {
    error.value = '名称不能为空'
    return
  }
  if (props.type === 'folder' && isEncrypted.value) {
    if (!password.value || password.value.length < 6) {
      error.value = '加密密码至少6位'
      return
    }
  }
  emit('confirm', {
    name: name.value.trim(),
    isEncrypted: isEncrypted.value,
    password: password.value,
  })
}
</script>

<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog">
      <h3>{{ type === 'folder' ? '新建文件夹' : '新建笔记' }}</h3>

      <label>
        {{ type === 'folder' ? '文件夹名称' : '笔记标题' }}
        <input
          ref="nameInputRef"
          v-model="name"
          type="text"
          :placeholder="type === 'folder' ? '请输入文件夹名称' : '请输入笔记标题'"
          @keyup.enter="handleConfirm"
        />
      </label>

      <template v-if="type === 'folder'">
        <label class="checkbox-label">
          <input v-model="isEncrypted" type="checkbox" />
          设为加密文件夹
        </label>
        <label v-if="isEncrypted">
          加密密码
          <input v-model="password" type="password" placeholder="至少6位" />
        </label>
      </template>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button type="button" class="btn-cancel" @click="handleClose">取消</button>
        <button type="button" class="btn-confirm" @click="handleConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  width: 400px;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.dialog h3 {
  margin: 0 0 20px;
  font-size: 18px;
  color: #1e293b;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 14px;
  color: #64748b;
}

input[type='text'],
input[type='password'] {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

input:focus {
  border-color: #2563eb;
}

.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  color: #374151;
  cursor: pointer;
}

.error {
  color: #ef4444;
  font-size: 13px;
  margin: 0 0 12px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
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

.btn-confirm {
  border: none;
  background: #2563eb;
  color: #fff;
}
</style>

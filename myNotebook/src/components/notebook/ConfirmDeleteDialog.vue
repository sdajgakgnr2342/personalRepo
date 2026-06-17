<script setup>
import { ref, watch, computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  itemName: { type: String, default: '' },
  itemType: { type: String, default: 'note' },
  childCount: { type: Number, default: 0 },
  encryptedFolders: { type: Array, default: () => [] },
  permanent: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const step = ref(1)
const passwords = ref({})
const error = ref('')

const typeLabel = computed(() => (props.itemType === 'folder' ? '文件夹' : '笔记'))
const needsPassword = computed(() => props.encryptedFolders.length > 0)

watch(() => props.visible, (val) => {
  if (val) {
    step.value = 1
    passwords.value = {}
    error.value = ''
  }
})

function handleClose() {
  emit('close')
}

function handleNext() {
  error.value = ''
  step.value = 2
}

function handleConfirm() {
  if (needsPassword.value) {
    for (const folder of props.encryptedFolders) {
      const pwd = passwords.value[folder.id]?.trim()
      if (!pwd) {
        error.value = `请输入「${folder.name}」的密码`
        return
      }
    }
    const payload = {}
    for (const folder of props.encryptedFolders) {
      payload[folder.id] = passwords.value[folder.id].trim()
    }
    emit('confirm', { passwords: payload })
    return
  }
  emit('confirm', {})
}
</script>

<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog">
      <template v-if="step === 1">
        <h3 class="dialog-title">
          <AppIcon name="warning" :size="20" alt="" />
          确认{{ permanent ? '永久删除' : '删除' }}
        </h3>
        <p class="main-text">
          确定要{{ permanent ? '永久删除' : '删除' }}{{ typeLabel }}「<strong>{{ itemName }}</strong>」吗？
        </p>
        <p v-if="needsPassword" class="warn encrypt-warn">
          其中包含 {{ encryptedFolders.length }} 个加密文件夹，继续{{ permanent ? '删除' : '操作' }}需输入对应密码验证。
        </p>
        <p v-else-if="permanent && itemType === 'folder' && childCount > 0" class="warn">
          该文件夹下共有 {{ childCount }} 项内容，将一并永久删除，无法恢复。
        </p>
        <p v-else-if="permanent && itemType === 'folder'" class="warn">
          文件夹内的内容将一并永久删除，无法恢复。
        </p>
        <p v-else-if="permanent" class="warn">
          永久删除后无法恢复，请谨慎操作。
        </p>
        <p v-else-if="itemType === 'folder' && childCount > 0" class="warn">
          该文件夹下共有 {{ childCount }} 项内容，将一并移入垃圾箱。
        </p>
        <p v-else-if="itemType === 'folder'" class="warn">
          文件夹内的内容将一并移入垃圾箱。
        </p>
        <p v-else class="warn">删除后将移入垃圾箱，不会立即永久删除。</p>
        <div class="actions">
          <button type="button" class="btn-cancel" @click="handleClose">取消</button>
          <button type="button" class="btn-next" @click="handleNext">下一步</button>
        </div>
      </template>

      <template v-else-if="needsPassword">
        <h3 class="dialog-title">
          <AppIcon name="lock" :size="20" alt="" />
          验证密码
        </h3>
        <p class="main-text">
          {{ permanent ? '永久删除' : '删除' }}加密文件夹前，请输入密码以确认身份。
        </p>
        <label v-for="folder in encryptedFolders" :key="folder.id" class="pwd-label">
          「{{ folder.name }}」密码
          <input
            v-model="passwords[folder.id]"
            type="password"
            placeholder="请输入文件夹密码"
            @keyup.enter="handleConfirm"
          />
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="actions">
          <button type="button" class="btn-cancel" @click="handleClose">取消</button>
          <button type="button" class="btn-danger" @click="handleConfirm">
            {{ permanent ? '确认永久删除' : '确认删除' }}
          </button>
        </div>
      </template>

      <template v-else>
        <h3 class="dialog-title">
          <AppIcon :name="permanent ? 'warning' : 'delete'" :size="20" alt="" />
          二次确认
        </h3>
        <p class="main-text">
          请再次确认：{{ permanent ? '永久删除' : '将' }}「<strong>{{ itemName }}</strong>」{{ permanent ? '？' : '移入垃圾箱？' }}
        </p>
        <p class="warn">{{ permanent ? '此操作不可恢复，数据将被彻底删除。' : '可在左侧「垃圾箱」中查看或恢复。此步骤不会永久删除数据。' }}</p>
        <div class="actions">
          <button type="button" class="btn-cancel" @click="handleClose">取消</button>
          <button type="button" class="btn-danger" @click="handleConfirm">
            {{ permanent ? '确认永久删除' : '确认删除' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4000;
}

.dialog {
  width: 400px;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.dialog h3,
.dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 18px;
  color: #1e293b;
}

.main-text {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.6;
  color: #374151;
}

.main-text strong {
  color: #1e293b;
}

.warn {
  margin: 0 0 20px;
  padding: 10px 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  font-size: 13px;
  color: #c2410c;
  line-height: 1.5;
}

.encrypt-warn {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.pwd-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #64748b;
}

.pwd-label input {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.pwd-label input:focus {
  border-color: #2563eb;
}

.error {
  margin: 0 0 12px;
  font-size: 13px;
  color: #ef4444;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.btn-cancel,
.btn-next,
.btn-danger {
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

.btn-next {
  border: none;
  background: #2563eb;
  color: #fff;
}

.btn-danger {
  border: none;
  background: #ef4444;
  color: #fff;
}

.btn-danger:hover {
  background: #dc2626;
}
</style>

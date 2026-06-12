<script setup>
defineProps({
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'discard', 'cancel'])
</script>

<template>
  <div v-if="visible" class="dialog-overlay" @click.self="emit('cancel')">
    <div class="dialog">
      <h3>未保存的更改</h3>
      <p class="main-text">当前笔记有未保存的内容，离开前如何处理？</p>
      <div class="actions">
        <button type="button" class="btn-cancel" @click="emit('cancel')">继续编辑</button>
        <button type="button" class="btn-discard" @click="emit('discard')">不保存</button>
        <button type="button" class="btn-save" @click="emit('save')">保存并离开</button>
      </div>
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
  z-index: 5000;
  padding: 16px;
}

.dialog {
  width: 100%;
  max-width: 400px;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.dialog h3 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #1e293b;
}

.main-text {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.6;
  color: #64748b;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel,
.btn-discard,
.btn-save {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #64748b;
}

.btn-discard {
  border: 1px solid #fecaca;
  background: #fff;
  color: #dc2626;
}

.btn-save {
  border: none;
  background: #2563eb;
  color: #fff;
}

.btn-save:hover {
  background: #1d4ed8;
}
</style>

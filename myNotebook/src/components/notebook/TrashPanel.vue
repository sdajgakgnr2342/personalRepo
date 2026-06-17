<script setup>
import { computed } from 'vue'
import { useNotebookStore } from '@/stores/notebook'
import AppIcon from '@/components/AppIcon.vue'
import { getContentTypeIcon } from '@/utils/icons'

const emit = defineEmits(['restore', 'permanent-delete'])
const notebookStore = useNotebookStore()

const item = computed(() => notebookStore.trashSelectedItem)

function formatTime(dateStr) {
  if (!dateStr) return '未知'
  return new Date(dateStr).toLocaleString('zh-CN')
}

function typeLabel(type) {
  return type === 'folder' ? '文件夹' : '笔记'
}
</script>

<template>
  <div v-if="item" class="trash-panel">
    <div class="trash-header">
      <AppIcon :name="getContentTypeIcon(item.itemType)" :size="36" class="trash-icon" alt="" />
      <div class="trash-title-wrap">
        <h2>{{ item.name }}</h2>
        <span class="type-badge">{{ typeLabel(item.itemType) }}</span>
      </div>
    </div>

    <p class="deleted-at">删除时间：{{ formatTime(item.deletedAt) }}</p>

    <div class="info-box">
      <p>恢复后内容将回到原来的位置。</p>
      <p>若父文件夹仍在垃圾箱中，需先恢复父文件夹。</p>
      <p class="warn">永久删除后无法恢复，请谨慎操作。</p>
    </div>

    <div class="actions">
      <button type="button" class="btn-restore" @click="emit('restore', item)">
        <AppIcon name="restore" :size="16" alt="" /> 恢复
      </button>
      <button type="button" class="btn-danger" @click="emit('permanent-delete', item)">
        <AppIcon name="delete-permanent" :size="16" alt="" /> 永久删除
      </button>
    </div>
  </div>
</template>

<style scoped>
.trash-panel {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.trash-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.trash-icon {
  flex-shrink: 0;
}

.trash-title-wrap h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #1e293b;
}

.type-badge {
  display: inline-block;
  padding: 2px 10px;
  background: #f1f5f9;
  border-radius: 999px;
  font-size: 12px;
  color: #64748b;
}

.deleted-at {
  margin: 0 0 24px;
  font-size: 14px;
  color: #94a3b8;
}

.info-box {
  max-width: 520px;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 28px;
}

.info-box p {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.7;
  color: #64748b;
}

.info-box p:last-child {
  margin-bottom: 0;
}

.info-box .warn {
  color: #b45309;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-restore,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-restore {
  border: 1px solid #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.btn-restore:hover {
  background: #dbeafe;
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

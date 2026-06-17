<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  targetName: { type: String, default: '' },
  itemId: { type: Number, default: null },
  itemName: { type: String, default: '' },
  itemType: { type: String, default: '' },
  canCreate: { type: Boolean, default: true },
})

const emit = defineEmits(['create-folder', 'create-note', 'delete-item', 'close'])

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="ctx-overlay"
      @click="emit('close')"
      @contextmenu.prevent="emit('close')"
    >
      <div
        class="ctx-menu"
        :style="{ left: `${x}px`, top: `${y}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <div v-if="targetName && canCreate" class="ctx-title">在「{{ targetName }}」下新建</div>
        <template v-if="canCreate">
          <button type="button" @click="emit('create-folder')">
            <AppIcon name="folder" :size="16" alt="" /> 新建文件夹
          </button>
          <button type="button" @click="emit('create-note')">
            <AppIcon name="note" :size="16" alt="" /> 新建笔记
          </button>
        </template>
        <div v-else-if="targetName" class="ctx-title locked-tip">
          <AppIcon name="lock" :size="16" alt="" /> 文件夹已锁定，请先解锁
        </div>

        <template v-if="itemId">
          <div class="ctx-divider" />
          <button type="button" class="danger" @click="emit('delete-item')">
            <AppIcon name="delete" :size="16" alt="" />
            删除{{ itemType === 'folder' ? '文件夹' : '笔记' }}「{{ itemName }}」
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ctx-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
}

.ctx-menu {
  position: fixed;
  min-width: 180px;
  max-width: 280px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  padding: 4px 0;
}

.ctx-title {
  padding: 8px 14px 6px;
  font-size: 11px;
  color: #94a3b8;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 4px;
}

.ctx-title.locked-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b45309;
  border-bottom: none;
  margin-bottom: 0;
  font-size: 12px;
}

.ctx-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0;
}

.ctx-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 14px;
  border: none;
  background: none;
  text-align: left;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ctx-menu button:hover {
  background: #f3f4f6;
}

.ctx-menu button.danger {
  color: #ef4444;
}

.ctx-menu button.danger:hover {
  background: #fef2f2;
}
</style>

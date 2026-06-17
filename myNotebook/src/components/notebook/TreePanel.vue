<script setup>
import { ref, computed } from 'vue'
import { useNotebookStore } from '@/stores/notebook'
import FolderTree from './FolderTree.vue'
import FolderAddMenu from './FolderAddMenu.vue'
import TreeContextMenu from './TreeContextMenu.vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'

const emit = defineEmits(['select-item', 'unlock-folder', 'create-folder', 'create-note', 'delete-item'])

const notebookStore = useNotebookStore()

const activeId = computed(() => notebookStore.currentItem?.id)
const rootParentId = computed(() => notebookStore.getRootFolderId())
const nodes = computed(() => notebookStore.getTreeNodes())

const ctxMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  parentId: null,
  parentName: '',
  itemId: null,
  itemName: '',
  itemType: '',
  isLocked: false,
})

function openContextMenu(e, payload) {
  e.preventDefault()
  e.stopPropagation()
  ctxMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    parentId: payload.parentId,
    parentName: payload.parentName,
    itemId: payload.itemId || null,
    itemName: payload.itemName || '',
    itemType: payload.itemType || '',
    isLocked: !!payload.isLocked,
  }
}

function closeContextMenu() {
  ctxMenu.value.visible = false
}

function handleRootContextMenu(e) {
  openContextMenu(e, {
    parentId: rootParentId.value,
    parentName: '我的笔记',
  })
}

function handleRootCreateFolder() {
  emit('create-folder', { parentId: rootParentId.value, parentName: '我的笔记' })
}

function handleRootCreateNote() {
  emit('create-note', { parentId: rootParentId.value, parentName: '我的笔记' })
}

function handleCtxCreateFolder() {
  emit('create-folder', {
    parentId: ctxMenu.value.parentId,
    parentName: ctxMenu.value.parentName,
  })
  closeContextMenu()
}

function handleCtxCreateNote() {
  emit('create-note', {
    parentId: ctxMenu.value.parentId,
    parentName: ctxMenu.value.parentName,
  })
  closeContextMenu()
}

function handleCtxDelete() {
  emit('delete-item', {
    id: ctxMenu.value.itemId,
    name: ctxMenu.value.itemName,
    itemType: ctxMenu.value.itemType,
  })
  closeContextMenu()
}
</script>

<template>
  <div class="tree-panel">
    <header class="tree-panel-header">
      <h2>
        <AppIcon name="my-notes" :size="22" alt="" />
        我的笔记
      </h2>
      <FolderAddMenu
        @create-folder="handleRootCreateFolder"
        @create-note="handleRootCreateNote"
      />
    </header>

    <div class="tree-panel-body" @contextmenu="handleRootContextMenu">
      <FolderTree
        v-if="nodes.length"
        :nodes="nodes"
        :active-id="activeId"
        @select="(id) => emit('select-item', id)"
        @unlock="(node) => emit('unlock-folder', node)"
        @create-folder="(payload) => emit('create-folder', payload)"
        @create-note="(payload) => emit('create-note', payload)"
        @delete-item="(payload) => emit('delete-item', payload)"
        @context-menu="openContextMenu"
      />
      <EmptyState
        v-else
        fill
        size="md"
        title="暂无笔记"
        description="还没有任何笔记或文件夹"
        hint="点击右上角 + 新建，或在空白处右键"
      />
    </div>

    <TreeContextMenu
      :visible="ctxMenu.visible"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :target-name="ctxMenu.parentName"
      :item-id="ctxMenu.itemId"
      :item-name="ctxMenu.itemName"
      :item-type="ctxMenu.itemType"
      :can-create="!ctxMenu.isLocked"
      @create-folder="handleCtxCreateFolder"
      @create-note="handleCtxCreateNote"
      @delete-item="handleCtxDelete"
      @close="closeContextMenu"
    />
  </div>
</template>

<style scoped>
.tree-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
}

.tree-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.tree-panel-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.tree-panel-header :deep(.add-btn) {
  opacity: 1;
}

.tree-panel-body {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px 16px 24px;
  -webkit-overflow-scrolling: touch;
}

.tree-panel-body :deep(.tree-root) {
  padding: 4px 0 8px 4px;
}

.tree-panel-body :deep(.tree-item) {
  padding: 8px 10px;
  border-radius: 8px;
  min-width: 0;
}

.tree-panel-body :deep(.add-menu-wrap) {
  flex-shrink: 0;
}

@media (min-width: 769px) {
  .tree-panel-header {
    padding: 20px 32px;
  }

  .tree-panel-body {
    padding: 16px 32px 32px;
  }
}

@media (max-width: 768px) {
  .tree-panel-header {
    padding: 12px 14px;
  }

  .tree-panel-header h2 {
    font-size: 16px;
  }

  .tree-panel-body {
    padding: 8px 10px 20px;
  }
}
</style>

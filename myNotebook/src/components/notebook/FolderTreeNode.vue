<script setup>
import { ref, computed, watch } from 'vue'
import FolderAddMenu from './FolderAddMenu.vue'
import AppIcon from '@/components/AppIcon.vue'
import { getTreeItemIcon } from '@/utils/icons'

const props = defineProps({
  node: { type: Object, required: true },
  activeId: { type: Number, default: null },
})

const emit = defineEmits(['select', 'unlock', 'create-folder', 'create-note', 'delete-item', 'context-menu'])

const isLockedFolder = computed(() =>
  props.node.itemType === 'folder' && props.node.isEncrypted && props.node.isLocked
)

const expanded = ref(false)

watch(() => props.node.isLocked, (locked) => {
  if (locked) expanded.value = false
})

function handleClick() {
  if (isLockedFolder.value) {
    emit('unlock', props.node)
    return
  }
  if (props.node.itemType === 'folder') {
    expanded.value = !expanded.value
    return
  }
  emit('select', props.node.id)
}

function handleContextMenu(e) {
  if (props.node.itemType === 'folder') {
    emit('context-menu', e, {
      parentId: props.node.id,
      parentName: props.node.name,
      itemId: props.node.id,
      itemName: props.node.name,
      itemType: 'folder',
      isLocked: isLockedFolder.value,
    })
  } else {
    emit('context-menu', e, {
      parentId: props.node.parentId,
      parentName: props.node.parentId ? '当前目录' : '我的笔记',
      itemId: props.node.id,
      itemName: props.node.name,
      itemType: 'note',
      isLocked: false,
    })
  }
}

function handleUnlock(e) {
  e.stopPropagation()
  emit('unlock', props.node)
}

function handleDelete(e) {
  e.stopPropagation()
  emit('delete-item', {
    id: props.node.id,
    name: props.node.name,
    itemType: props.node.itemType,
  })
}

function handleCreateFolder() {
  emit('create-folder', { parentId: props.node.id, parentName: props.node.name })
}

function handleCreateNote() {
  emit('create-note', { parentId: props.node.id, parentName: props.node.name })
}
</script>

<template>
  <li>
    <div
      class="tree-item"
      :class="{
        active: activeId === node.id,
        encrypted: node.isEncrypted,
        locked: isLockedFolder,
        folder: node.itemType === 'folder',
      }"
      @click="handleClick"
      @contextmenu="handleContextMenu"
    >
      <span class="expand-icon">
        <template v-if="node.itemType === 'folder' && !isLockedFolder">
          <AppIcon
            v-if="node.children?.length"
            :name="expanded ? 'collapse' : 'expand'"
            :size="12"
            alt=""
          />
        </template>
      </span>
      <AppIcon
        :name="getTreeItemIcon(node, isLockedFolder)"
        :size="16"
        alt=""
        class="item-icon"
      />
      <span class="item-name">{{ node.name }}</span>

      <FolderAddMenu
        v-if="node.itemType === 'folder' && !isLockedFolder"
        @create-folder="handleCreateFolder"
        @create-note="handleCreateNote"
      />

      <button
        type="button"
        class="del-btn"
        title="删除"
        @click="handleDelete"
      >
        <AppIcon name="close" :size="14" alt="删除" />
      </button>

      <button
        v-if="isLockedFolder"
        class="lock-btn"
        title="输入密码解锁"
        @click="handleUnlock"
      >
        <AppIcon name="lock" :size="14" alt="解锁" />
      </button>
    </div>
    <ul v-if="!isLockedFolder && expanded && node.children?.length" class="tree-children">
      <FolderTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :active-id="activeId"
        @select="(id) => emit('select', id)"
        @unlock="(n) => emit('unlock', n)"
        @create-folder="(payload) => emit('create-folder', payload)"
        @create-note="(payload) => emit('create-note', payload)"
        @delete-item="(payload) => emit('delete-item', payload)"
        @context-menu="(e, payload) => emit('context-menu', e, payload)"
      />
    </ul>
  </li>
</template>

<style scoped>
.tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 8px 7px 4px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  border-radius: 6px;
  margin: 1px 8px 1px 0;
  transition: background 0.15s;
}

.tree-item:hover :deep(.add-btn),
.tree-item:hover .del-btn {
  opacity: 1;
}

.tree-item:hover {
  background: #f3f4f6;
}

.tree-item.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.tree-item.encrypted {
  background: #fffbeb;
}

.tree-item.encrypted.active {
  background: #fef3c7;
}

.tree-item.locked {
  cursor: default;
  background: #fff7ed;
}

.tree-item.locked:hover {
  background: #ffedd5;
}

.expand-icon {
  width: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-icon {
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.del-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.15s, background 0.15s;
}

.del-btn:hover {
  background: #fef2f2;
}

.lock-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  padding: 2px;
  flex-shrink: 0;
}

.tree-children {
  list-style: none;
  padding: 0 0 0 18px;
  margin: 0 0 0 10px;
  border-left: 1px solid #e8ecf0;
}
</style>

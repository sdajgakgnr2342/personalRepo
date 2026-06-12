<script setup>
import { ref, computed, watch } from 'vue'
import { useNotebookStore } from '@/stores/notebook'
import FolderTree from './FolderTree.vue'
import FolderAddMenu from './FolderAddMenu.vue'
import TreeContextMenu from './TreeContextMenu.vue'

const emit = defineEmits(['select-item', 'select-trash-item', 'unlock-folder', 'show-stats', 'switch-mode', 'create-folder', 'create-note', 'delete-item'])
const notebookStore = useNotebookStore()

defineProps({
  mobileOpen: { type: Boolean, default: false },
})

const collapsed = ref(localStorage.getItem('sidebarCollapsed') === '1')
const activeId = computed(() => notebookStore.currentItem?.id)
const rootParentId = computed(() => notebookStore.getRootFolderId())

watch(collapsed, (val) => {
  localStorage.setItem('sidebarCollapsed', val ? '1' : '0')
})

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

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function switchMode(mode) {
  emit('switch-mode', mode)
  if (collapsed.value && mode !== 'stats') {
    collapsed.value = false
  }
}

function handleShowStats() {
  emit('show-stats')
}

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
  if (notebookStore.sidebarMode !== 'tree' || collapsed.value) return
  openContextMenu(e, {
    parentId: rootParentId.value,
    parentName: '我的笔记',
  })
}

function handleTreeContextMenu(e, payload) {
  openContextMenu(e, payload)
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
  <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
    <button
      type="button"
      class="collapse-btn"
      :title="collapsed ? '展开菜单' : '收起菜单'"
      @click="toggleCollapse"
    >
      <span class="collapse-icon">{{ collapsed ? '»' : '«' }}</span>
      <span v-show="!collapsed" class="collapse-label">收起</span>
    </button>

    <div class="sidebar-inner">
      <section class="nav-section">
        <div
          class="nav-item stats-menu"
          :class="{ active: notebookStore.sidebarMode === 'stats' }"
          title="统计"
          @click="handleShowStats"
        >
          <span class="nav-icon">📊</span>
          <span v-show="!collapsed" class="nav-label">统计</span>
        </div>
      </section>

      <section class="nav-section">
        <div
          class="nav-header"
          :class="{ active: notebookStore.sidebarMode === 'tree' }"
          title="我的笔记"
          @click="switchMode('tree')"
          @contextmenu="handleRootContextMenu"
        >
          <span class="nav-icon">📂</span>
          <span v-show="!collapsed" class="nav-header-label">我的笔记</span>
          <FolderAddMenu
            v-if="!collapsed && notebookStore.sidebarMode === 'tree'"
            @create-folder="handleRootCreateFolder"
            @create-note="handleRootCreateNote"
          />
        </div>
        <FolderTree
          v-if="!collapsed && notebookStore.sidebarMode === 'tree'"
          :nodes="notebookStore.getTreeNodes()"
          :active-id="activeId"
          @select="(id) => emit('select-item', id)"
          @unlock="(node) => emit('unlock-folder', node)"
          @create-folder="(payload) => emit('create-folder', payload)"
          @create-note="(payload) => emit('create-note', payload)"
          @delete-item="(payload) => emit('delete-item', payload)"
          @context-menu="handleTreeContextMenu"
        />
      </section>

      <section class="nav-section shortcuts">
        <div
          class="nav-item"
          :class="{ active: notebookStore.sidebarMode === 'drafts' }"
          title="草稿箱"
          @click="switchMode('drafts')"
        >
          <span class="nav-icon-wrap">
            <span class="nav-icon">📝</span>
            <span
              v-if="collapsed && notebookStore.stats.draftCount"
              class="icon-badge"
            >{{ notebookStore.stats.draftCount > 9 ? '9+' : notebookStore.stats.draftCount }}</span>
          </span>
          <span v-show="!collapsed" class="nav-label">草稿箱</span>
          <span v-if="!collapsed" class="badge">{{ notebookStore.stats.draftCount || 0 }}</span>
        </div>

        <template v-if="!collapsed && notebookStore.sidebarMode === 'drafts'">
          <div
            v-for="item in notebookStore.drafts"
            :key="item.id"
            class="sub-item"
            @click="emit('select-item', item.id)"
          >
            {{ item.name }}
          </div>
          <div v-if="!notebookStore.drafts.length" class="empty-tip">暂无草稿</div>
        </template>

        <div
          class="nav-item"
          :class="{ active: notebookStore.sidebarMode === 'favorites' }"
          title="收藏夹"
          @click="switchMode('favorites')"
        >
          <span class="nav-icon">⭐</span>
          <span v-show="!collapsed" class="nav-label">收藏夹</span>
        </div>

        <template v-if="!collapsed && notebookStore.sidebarMode === 'favorites'">
          <div
            v-for="item in notebookStore.favorites"
            :key="item.id"
            class="sub-item"
            @click="emit('select-item', item.id)"
          >
            {{ item.name }}
          </div>
          <div v-if="!notebookStore.favorites.length" class="empty-tip">暂无收藏</div>
        </template>

        <div
          class="nav-item"
          :class="{ active: notebookStore.sidebarMode === 'trash' }"
          title="垃圾箱"
          @click="switchMode('trash')"
        >
          <span class="nav-icon">🗑️</span>
          <span v-show="!collapsed" class="nav-label">垃圾箱</span>
        </div>

        <template v-if="!collapsed && notebookStore.sidebarMode === 'trash'">
          <div
            v-for="item in notebookStore.trash"
            :key="item.id"
            class="sub-item trash-item"
            :class="{ active: notebookStore.trashSelectedItem?.id === item.id }"
            @click="emit('select-trash-item', item)"
          >
            <span class="trash-item-icon">{{ item.itemType === 'folder' ? '📁' : '📄' }}</span>
            {{ item.name }}
          </div>
          <div v-if="!notebookStore.trash.length" class="empty-tip">垃圾箱为空</div>
        </template>
      </section>
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
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  min-width: 240px;
  background: #fafafa;
  border-right: 1px solid #e5e7eb;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  transition: width 0.22s ease, min-width 0.22s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 52px;
    bottom: 0;
    z-index: 200;
    width: 260px;
    min-width: 260px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: none;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12);
  }

  .sidebar.collapsed {
    width: 260px;
    min-width: 260px;
  }
}

.sidebar-inner {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-section {
  padding: 4px 0;
  border-bottom: 1px solid #f1f5f9;
}

.nav-section:last-child {
  border-bottom: none;
}

.stats-menu {
  margin-top: 0;
}

.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 8px;
  border: none;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.nav-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #374151;
}

.sidebar.collapsed .nav-header {
  justify-content: center;
  padding: 10px 8px;
}

.nav-header:hover {
  background: #f3f4f6;
}

.nav-header:hover :deep(.add-btn) {
  opacity: 1;
}

.nav-header.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.nav-header-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  color: #374151;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px 8px;
}

.nav-item:hover {
  background: #f3f4f6;
}

.nav-item.active {
  background: #dbeafe;
  color: #1d4ed8;
}

.shortcuts .nav-item {
  justify-content: space-between;
}

.sidebar.collapsed .shortcuts .nav-item {
  justify-content: center;
}

.nav-icon {
  flex-shrink: 0;
  font-size: 18px;
  line-height: 1;
  width: 22px;
  text-align: center;
}

.nav-icon-wrap {
  position: relative;
  flex-shrink: 0;
  width: 22px;
  display: flex;
  justify-content: center;
}

.icon-badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  background: #ef4444;
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
  border-radius: 7px;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge {
  background: #e5e7eb;
  color: #64748b;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.sub-item {
  padding: 6px 16px 6px 32px;
  font-size: 13px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-item:hover,
.sub-item.active {
  background: #f3f4f6;
}

.sub-item.active {
  color: #2563eb;
  font-weight: 500;
}

.trash-item-icon {
  flex-shrink: 0;
  font-size: 12px;
}

.empty-tip {
  padding: 8px 32px;
  font-size: 12px;
  color: #9ca3af;
}

.collapse-btn:hover {
  background: #f1f5f9;
  color: #2563eb;
}

.sidebar.collapsed .collapse-btn {
  padding: 12px 8px;
}

.collapse-icon {
  font-size: 16px;
  line-height: 1;
}

.collapse-label {
  white-space: nowrap;
}
</style>

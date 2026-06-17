<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useNotebookStore } from '@/stores/notebook'
import { useUserStore } from '@/stores/user'
import { searchNotes, createNote, createFolder } from '@/api/item'
import { toastSuccess, toastError } from '@/utils/toast'
import TopBar from '@/components/notebook/TopBar.vue'
import Sidebar from '@/components/notebook/Sidebar.vue'
import StatsPanel from '@/components/notebook/StatsPanel.vue'
import EditorPanel from '@/components/notebook/EditorPanel.vue'
import EmptyPanel from '@/components/notebook/EmptyPanel.vue'
import EmptyState from '@/components/EmptyState.vue'
import TreePanel from '@/components/notebook/TreePanel.vue'
import TrashPanel from '@/components/notebook/TrashPanel.vue'
import UnlockDialog from '@/components/notebook/UnlockDialog.vue'
import CreateItemDialog from '@/components/notebook/CreateItemDialog.vue'
import ConfirmDeleteDialog from '@/components/notebook/ConfirmDeleteDialog.vue'

const notebookStore = useNotebookStore()
const userStore = useUserStore()

const unlockFolder = ref(null)
const pendingOpenItemId = ref(null)
const unlockMinutes = ref(5)
const searchResults = ref([])
const snapshotBeforeSearch = ref(null)
const createDialogVisible = ref(false)
const createDialogType = ref('folder')
const createParentId = ref(null)
const deleteDialogVisible = ref(false)
const deleteTarget = ref({ id: null, name: '', itemType: 'note' })
const deleteChildCount = ref(0)
const deleteEncryptedFolders = ref([])
const deletePermanent = ref(false)
const deleting = ref(false)
const mobileSidebarOpen = ref(false)
const isMobile = ref(false)

function updateMobile() {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) mobileSidebarOpen.value = false
}

function closeMobileSidebar() {
  mobileSidebarOpen.value = false
}

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value
}

async function withLeaveGuard(action, { closeSidebar = true } = {}) {
  const canLeave = await notebookStore.tryLeaveEditor()
  if (!canLeave) return false
  await action()
  if (closeSidebar) closeMobileSidebar()
  return true
}

onMounted(async () => {
  updateMobile()
  window.addEventListener('resize', updateMobile)
  await userStore.fetchUserInfo()
  try {
    await notebookStore.initFromSession()
  } catch (err) {
    if (err.message?.includes('加密') && err.data?.folderId) {
      let savedId = null
      try {
        savedId = JSON.parse(sessionStorage.getItem('notebook-session') || 'null')?.currentItemId
      } catch {
        savedId = null
      }
      pendingOpenItemId.value = savedId
      const folder = notebookStore.findFolderById(err.data.folderId)
      unlockFolder.value = {
        id: err.data.folderId,
        name: folder?.name || '加密文件夹',
      }
    } else {
      notebookStore.showStats()
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateMobile)
})

onBeforeRouteLeave(async () => {
  return notebookStore.tryLeaveEditor()
})

async function handleRefresh() {
  const itemId = notebookStore.currentItem?.id
  try {
    await notebookStore.refreshCurrentView()
    toastSuccess('已刷新')
  } catch (err) {
    if (err.message?.includes('加密') && err.data?.folderId) {
      pendingOpenItemId.value = itemId ?? null
      const folder = notebookStore.findFolderById(err.data.folderId)
      unlockFolder.value = {
        id: err.data.folderId,
        name: folder?.name || '加密文件夹',
      }
    } else {
      toastError(err.message || '刷新失败')
    }
  }
}

async function handleSelectItem(id) {
  const ok = await withLeaveGuard(async () => {
    try {
      await notebookStore.openItem(id)
    } catch (err) {
      if (err.message.includes('加密') && err.data?.folderId) {
        pendingOpenItemId.value = id
        const folder = notebookStore.findFolderById(err.data.folderId)
        unlockFolder.value = {
          id: err.data.folderId,
          name: folder?.name || '加密文件夹',
        }
      } else {
        toastError(err.message)
      }
    }
  }, { closeSidebar: false })

  // 移动端：浏览文件夹时保持侧栏打开，选中笔记后再关闭
  if (ok && isMobile.value && notebookStore.currentItem?.itemType === 'note') {
    closeMobileSidebar()
  }
}

function handleOpenNote(note) {
  handleSelectItem(note.id)
}

async function handleShowStats() {
  await withLeaveGuard(() => {
    notebookStore.showStats()
  })
}

function handleUnlockFolder(node) {
  pendingOpenItemId.value = null
  unlockFolder.value = node
}

function handleUnlockClose() {
  unlockFolder.value = null
  pendingOpenItemId.value = null
}

async function handleUnlocked(result) {
  unlockFolder.value = null
  if (result?.unlockMinutes) unlockMinutes.value = result.unlockMinutes
  await notebookStore.loadTree()
  const itemId = pendingOpenItemId.value
  pendingOpenItemId.value = null
  if (itemId) {
    try {
      await notebookStore.openItem(itemId)
    } catch (err) {
      toastError(err.message)
    }
  }
}

async function handleSearch(keyword) {
  await withLeaveGuard(async () => {
    snapshotBeforeSearch.value = notebookStore.getSessionSnapshot()
    searchResults.value = await searchNotes(keyword)
    notebookStore.showSearch()
  })
}

async function handleSearchBack() {
  const snapshot = snapshotBeforeSearch.value
  snapshotBeforeSearch.value = null
  if (snapshot) {
    try {
      await notebookStore.applySnapshot(snapshot)
    } catch (err) {
      toastError(err.message || '返回失败')
      notebookStore.showStats()
    }
    return
  }
  notebookStore.showStats()
}

function handleCreateFolder({ parentId }) {
  createParentId.value = parentId ?? notebookStore.getRootFolderId()
  createDialogType.value = 'folder'
  createDialogVisible.value = true
}

function handleCreateNote({ parentId }) {
  createParentId.value = parentId ?? notebookStore.getRootFolderId()
  createDialogType.value = 'note'
  createDialogVisible.value = true
}

async function handleCreateConfirm(payload) {
  try {
    if (createDialogType.value === 'folder') {
      const result = await createFolder({
        name: payload.name,
        parentId: createParentId.value,
        isEncrypted: payload.isEncrypted,
        password: payload.password,
      })
      createDialogVisible.value = false
      await notebookStore.refreshPartial(['stats', 'tree'])
      notebookStore.setSidebarMode('tree')
      await notebookStore.openItem(result.id, { rename: true })
      toastSuccess('文件夹创建成功')
    } else {
      const result = await createNote({
        name: payload.name,
        parentId: createParentId.value,
      })
      createDialogVisible.value = false
      await notebookStore.refreshPartial(['stats', 'tree'])
      notebookStore.setSidebarMode('tree')
      await notebookStore.openItem(result.id, { rename: true })
      toastSuccess('笔记创建成功')
    }
    closeMobileSidebar()
  } catch (err) {
    toastError(err.message || '创建失败')
  }
}

function handleDeleteItem({ id, name, itemType }) {
  deletePermanent.value = false
  deleteTarget.value = { id, name, itemType }
  deleteChildCount.value = itemType === 'folder' ? notebookStore.countDescendants(id) : 0
  deleteEncryptedFolders.value = notebookStore.findEncryptedFoldersInSubtree(id)
  deleteDialogVisible.value = true
}

async function handleTrashRestore(item) {
  try {
    await notebookStore.restoreTrashItem(item.id)
    toastSuccess('已恢复')
  } catch (err) {
    toastError(err.message || '恢复失败')
  }
}

async function handleTrashPermanentDelete(item) {
  deletePermanent.value = true
  deleteTarget.value = { id: item.id, name: item.name, itemType: item.itemType }
  deleteChildCount.value = item.itemType === 'folder' ? notebookStore.countDescendants(item.id) : 0
  try {
    deleteEncryptedFolders.value = await notebookStore.getEncryptedFoldersInSubtree(item.id)
  } catch {
    deleteEncryptedFolders.value = []
  }
  deleteDialogVisible.value = true
}

async function handleSelectTrashItem(item) {
  await withLeaveGuard(() => {
    notebookStore.selectTrashItem(item)
  })
}

async function handleSwitchMode(mode) {
  const ok = await withLeaveGuard(() => {
    notebookStore.setSidebarMode(mode)
  }, { closeSidebar: false })

  if (ok && isMobile.value && mode === 'tree') {
    closeMobileSidebar()
  }
}

async function handleDeleteConfirm(payload = {}) {
  if (!deleteTarget.value.id || deleting.value) return
  deleting.value = true
  try {
    if (deletePermanent.value) {
      await notebookStore.permanentDeleteItem(deleteTarget.value.id, payload.passwords)
      toastSuccess('已永久删除')
    } else {
      await notebookStore.deleteItem(deleteTarget.value.id, payload.passwords)
      toastSuccess('已移入垃圾箱')
    }
    deleteDialogVisible.value = false
  } catch (err) {
    toastError(err.message || '删除失败')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="notebook-app">
    <TopBar
      :show-menu-button="isMobile"
      @search="handleSearch"
      @refresh="handleRefresh"
      @toggle-sidebar="toggleMobileSidebar"
    />

    <div class="notebook-body">
      <div
        v-if="isMobile && mobileSidebarOpen"
        class="sidebar-overlay"
        @click="closeMobileSidebar"
      />

      <Sidebar
        :mobile-open="mobileSidebarOpen"
        @close-mobile="closeMobileSidebar"
        @select-item="handleSelectItem"
        @select-trash-item="handleSelectTrashItem"
        @show-stats="handleShowStats"
        @switch-mode="handleSwitchMode"
      />

      <div class="main-area">
        <StatsPanel
          v-if="notebookStore.rightView === 'stats'"
          @open-note="handleOpenNote"
        />

        <TreePanel
          v-else-if="notebookStore.rightView === 'tree'"
          @select-item="handleSelectItem"
          @unlock-folder="handleUnlockFolder"
          @create-folder="handleCreateFolder"
          @create-note="handleCreateNote"
          @delete-item="handleDeleteItem"
        />

        <div v-else-if="notebookStore.rightView === 'search'" class="search-results">
          <div class="search-header">
            <span>搜索结果 ({{ searchResults.length }})</span>
            <button type="button" class="search-back" @click="handleSearchBack">返回</button>
          </div>
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="search-item"
            @click="handleSelectItem(item.id)"
          >
            <span>{{ item.name }}</span>
            <span class="search-meta">{{ item.wordCount ?? item.word_count }} 字</span>
          </div>
          <EmptyState
            v-if="!searchResults.length"
            fill
            size="md"
            title="未找到匹配的笔记"
            description="试试其他关键词"
          />
        </div>

        <EditorPanel
          v-else-if="notebookStore.rightView === 'editor'"
          @delete-item="handleDeleteItem"
        />

        <TrashPanel
          v-else-if="notebookStore.rightView === 'trash'"
          @restore="handleTrashRestore"
          @permanent-delete="handleTrashPermanentDelete"
        />

        <EmptyPanel v-else />
      </div>
    </div>

    <UnlockDialog
      v-if="unlockFolder"
      :folder-id="unlockFolder.id"
      :folder-name="unlockFolder.name"
      :unlock-minutes="unlockMinutes"
      @unlocked="handleUnlocked"
      @close="handleUnlockClose"
    />

    <CreateItemDialog
      :visible="createDialogVisible"
      :type="createDialogType"
      @close="createDialogVisible = false"
      @confirm="handleCreateConfirm"
    />

    <ConfirmDeleteDialog
      :visible="deleteDialogVisible"
      :item-name="deleteTarget.name"
      :item-type="deleteTarget.itemType"
      :child-count="deleteChildCount"
      :encrypted-folders="deleteEncryptedFolders"
      :permanent="deletePermanent"
      @close="deleteDialogVisible = false"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<style scoped>
.notebook-app {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.notebook-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.sidebar-overlay {
  position: fixed;
  inset: 52px 0 0 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 150;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.search-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px 24px;
  min-height: 0;
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #64748b;
  margin-bottom: 12px;
}

.search-back {
  padding: 0;
  border: none;
  background: none;
  font-size: 14px;
  color: #2563eb;
  cursor: pointer;
}

.search-back:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

.search-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  font-size: 14px;
}

.search-item:hover {
  background: #f8fafc;
}

.search-meta {
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .search-results {
    padding: 12px 16px;
  }
}
</style>

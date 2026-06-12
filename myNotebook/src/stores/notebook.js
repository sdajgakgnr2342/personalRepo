import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as notebookApi from '@/api/notebook'
import * as itemApi from '@/api/item'

export const useNotebookStore = defineStore('notebook', () => {
  const stats = ref({ noteCount: 0, draftCount: 0, recentNotes: [] })
  const tree = ref([])
  const drafts = ref([])
  const favorites = ref([])
  const trash = ref([])
  const currentItem = ref(null)
  const sidebarMode = ref('stats')
  const rightView = ref('stats')
  const trashSelectedItem = ref(null)
  const loading = ref(false)
  const pendingRenameItemId = ref(null)
  const hasUnsavedChanges = ref(false)
  const editorActions = ref(null)

  function getDefaultParentId() {
    const item = currentItem.value
    if (item?.itemType === 'folder') return item.id
    if (item?.itemType === 'note' && item.parentId) return item.parentId
    return getRootFolderId()
  }

  function getRootFolderId() {
    const named = tree.value.find(
      (n) => n.itemType === 'folder' && n.name === '我的笔记' && (n.parentId == null)
    )
    return named?.id || null
  }

  function getTreeNodes() {
    const root = tree.value.find(
      (n) => n.itemType === 'folder' && n.name === '我的笔记' && (n.parentId == null)
    )
    if (root) return root.children || []
    return tree.value
  }

  function countDescendants(nodeId) {
    function walk(nodes) {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return countChildren(node.children || [])
        }
        if (node.children?.length) {
          const found = walk(node.children)
          if (found >= 0) return found
        }
      }
      return -1
    }
    function countChildren(nodes) {
      let total = 0
      for (const node of nodes) {
        total += 1
        if (node.children?.length) total += countChildren(node.children)
      }
      return total
    }
    const result = walk(tree.value)
    return result >= 0 ? result : 0
  }

  async function renameItem(id, name) {
    await itemApi.updateItem(id, { name: name.trim() })
    if (currentItem.value?.id === id) {
      currentItem.value = { ...currentItem.value, name: name.trim() }
    }
    await refreshPartial(['tree'])
  }

  async function loadStats() {
    stats.value = await notebookApi.getStats()
  }

  async function loadTree() {
    tree.value = await notebookApi.getTree()
  }

  async function loadDrafts() {
    drafts.value = await notebookApi.getDrafts()
  }

  async function loadFavorites() {
    favorites.value = await notebookApi.getFavorites()
  }

  async function loadTrash() {
    trash.value = await notebookApi.getTrash()
  }

  async function loadAll() {
    await refreshPartial(['stats', 'tree', 'drafts', 'favorites', 'trash'])
  }

  async function refreshPartial(keys) {
    const loaders = {
      stats: loadStats,
      tree: loadTree,
      drafts: loadDrafts,
      favorites: loadFavorites,
      trash: loadTrash,
    }
    loading.value = true
    try {
      await Promise.all(keys.map((key) => loaders[key]?.()))
    } finally {
      loading.value = false
    }
  }

  function setHasUnsavedChanges(value) {
    hasUnsavedChanges.value = value
  }

  function registerEditorActions(actions) {
    editorActions.value = actions
  }

  function unregisterEditorActions() {
    editorActions.value = null
    hasUnsavedChanges.value = false
  }

  async function tryLeaveEditor() {
    if (!hasUnsavedChanges.value || !editorActions.value) return true
    return editorActions.value.requestLeave()
  }

  const SESSION_KEY = 'notebook-session'

  function persistSession() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      currentItemId: currentItem.value?.id ?? null,
      sidebarMode: sidebarMode.value,
      rightView: rightView.value,
    }))
  }

  function getSessionSnapshot() {
    return {
      currentItemId: currentItem.value?.id ?? null,
      sidebarMode: sidebarMode.value,
      rightView: rightView.value,
    }
  }

  async function applySnapshot(snapshot) {
    sidebarMode.value = snapshot.sidebarMode || 'stats'
    if (snapshot.rightView === 'editor' && snapshot.currentItemId) {
      await openItem(snapshot.currentItemId)
      persistSession()
      return
    }
    currentItem.value = null
    if (snapshot.rightView === 'stats') {
      rightView.value = 'stats'
    } else {
      rightView.value = snapshot.rightView || 'empty'
    }
    persistSession()
  }

  async function initFromSession() {
    let snapshot = null
    try {
      snapshot = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    } catch {
      snapshot = null
    }
    await loadAll()
    if (!snapshot) {
      showStats()
      persistSession()
      return
    }
    await applySnapshot(snapshot)
  }

  async function refreshCurrentView() {
    const snapshot = getSessionSnapshot()
    persistSession()
    await loadAll()
    await applySnapshot(snapshot)
  }

  async function openItem(id, options = {}) {
    currentItem.value = await itemApi.getItem(id)
    rightView.value = 'editor'
    if (options.rename) pendingRenameItemId.value = id
    persistSession()
    return currentItem.value
  }

  async function saveCurrentNote(payload) {
    if (!currentItem.value) return
    const result = await itemApi.saveNote(currentItem.value.id, payload)
    currentItem.value = {
      ...currentItem.value,
      ...payload,
      isSaved: true,
      wordCount: result.wordCount,
      lastSavedAt: result.lastSavedAt,
    }
    await refreshPartial(['stats', 'tree'])
    return result
  }

  function setSidebarMode(mode) {
    sidebarMode.value = mode
    currentItem.value = null
    trashSelectedItem.value = null
    if (mode === 'stats') {
      rightView.value = 'stats'
    } else {
      rightView.value = 'empty'
    }
    persistSession()
  }

  function selectTrashItem(item) {
    sidebarMode.value = 'trash'
    trashSelectedItem.value = item
    currentItem.value = null
    rightView.value = 'trash'
    persistSession()
  }

  async function restoreTrashItem(id) {
    await itemApi.restoreItem(id)
    if (trashSelectedItem.value?.id === id) {
      trashSelectedItem.value = null
      rightView.value = 'empty'
    }
    await refreshPartial(['stats', 'tree', 'trash'])
    persistSession()
  }

  async function permanentDeleteItem(id, passwords) {
    await itemApi.permanentDelete(id, passwords ? { passwords } : undefined)
    if (trashSelectedItem.value?.id === id) {
      trashSelectedItem.value = null
      rightView.value = 'empty'
    }
    if (currentItem.value?.id === id) {
      currentItem.value = null
      rightView.value = sidebarMode.value === 'stats' ? 'stats' : 'empty'
    }
    await refreshPartial(['stats', 'tree', 'trash'])
    persistSession()
  }

  async function toggleFavorite(id) {
    const { isFavorite } = await itemApi.toggleFavorite(id)
    if (currentItem.value?.id === id) {
      currentItem.value = { ...currentItem.value, isFavorite }
    }
    await loadFavorites()
    await loadTree()
  }

  async function getEncryptedFoldersInSubtree(id) {
    return itemApi.getEncryptedFolders(id)
  }

  function showStats() {
    sidebarMode.value = 'stats'
    rightView.value = 'stats'
    currentItem.value = null
    persistSession()
  }

  function showSearch() {
    rightView.value = 'search'
    persistSession()
  }

  function findFolderById(id) {
    let found = null
    function walk(nodes) {
      for (const node of nodes) {
        if (node.id === id) {
          found = node
          return
        }
        if (node.children?.length) walk(node.children)
      }
    }
    walk(tree.value)
    return found
  }

  function findEncryptedFoldersInSubtree(nodeId) {
    const result = []

    function collect(node) {
      if (node.itemType === 'folder' && node.isEncrypted) {
        result.push({ id: node.id, name: node.name })
      }
      for (const child of node.children || []) {
        collect(child)
      }
    }

    function walk(nodes) {
      for (const node of nodes) {
        if (node.id === nodeId) {
          collect(node)
          return true
        }
        if (node.children?.length && walk(node.children)) return true
      }
      return false
    }

    walk(tree.value)
    return result
  }

  async function deleteItem(id, passwords) {
    await itemApi.moveToTrash(id, passwords ? { passwords } : undefined)
    if (currentItem.value?.id === id) {
      currentItem.value = null
      rightView.value = sidebarMode.value === 'stats' ? 'stats' : 'empty'
    }
    await refreshPartial(['stats', 'tree', 'trash'])
    persistSession()
  }

  function clearCurrent() {
    currentItem.value = null
  }

  return {
    stats, tree, drafts, favorites, trash, currentItem, sidebarMode, rightView, loading,
    trashSelectedItem, hasUnsavedChanges,
    pendingRenameItemId,
    loadStats, loadTree, loadDrafts, loadFavorites, loadTrash, loadAll, refreshPartial,
    openItem, saveCurrentNote, setSidebarMode, selectTrashItem, showStats, showSearch, clearCurrent,
    getDefaultParentId, getRootFolderId, getTreeNodes, renameItem, deleteItem, countDescendants,
    findEncryptedFoldersInSubtree, findFolderById, restoreTrashItem, permanentDeleteItem, toggleFavorite,
    getEncryptedFoldersInSubtree, setHasUnsavedChanges, registerEditorActions, unregisterEditorActions,
    tryLeaveEditor,
    initFromSession, refreshCurrentView, getSessionSnapshot,
  }
})

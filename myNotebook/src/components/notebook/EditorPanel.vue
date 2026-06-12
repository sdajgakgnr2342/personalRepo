<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useNotebookStore } from '@/stores/notebook'
import { shareNote, uploadAttachment, getAttachments, deleteAttachment } from '@/api/item'
import { toastSuccess, toastError, toastWarning } from '@/utils/toast'
import UnsavedChangesDialog from './UnsavedChangesDialog.vue'

const notebookStore = useNotebookStore()

const emit = defineEmits(['delete-item'])

const editTitle = ref('')
const editContent = ref('')
const folderName = ref('')
const isEditing = ref(true)
const saving = ref(false)
const message = ref('')
const history = ref([])
const historyIndex = ref(-1)
const fileInput = ref(null)
const imageInput = ref(null)
const titleInputRef = ref(null)
const folderNameInputRef = ref(null)
const contentEditorRef = ref(null)
const attachments = ref([])
const attachmentsLoading = ref(false)
const saveStatus = ref('saved')
const lastSavedTitle = ref('')
const lastSavedContent = ref('')
let savedSelection = null
let selectedImageEl = null
let isEditorInput = false
let isLoadingItem = false
let isApplyingHistory = false
let autoSaveTimer = null
const AUTO_SAVE_DELAY = 2000

const currentItem = computed(() => notebookStore.currentItem)
const canShare = computed(() => currentItem.value?.isSaved)
const isFavorite = computed(() => !!currentItem.value?.isFavorite)
const wordCount = computed(() => {
  const text = editContent.value || ''
  return text.replace(/<[^>]+>/g, '').replace(/\s/g, '').length
})

const fontSizes = [12, 14, 15, 16, 18, 20, 24, 28, 32]
const fontColor = ref('#374151')
const imgContextMenu = ref({ visible: false, x: 0, y: 0, src: '', alt: '', imgEl: null })
const imagePreview = ref({ visible: false, src: '', alt: '' })
const leaveDialogVisible = ref(false)
let pendingLeaveResolve = null

const saveStatusText = computed(() => {
  switch (saveStatus.value) {
    case 'saving':
      return '保存中...'
    case 'dirty':
      return '未保存'
    case 'error':
      return '保存失败'
    default:
      return '已保存'
  }
})

function isDirty() {
  return editTitle.value !== lastSavedTitle.value || editContent.value !== lastSavedContent.value
}

function syncUnsavedState() {
  if (isLoadingItem || currentItem.value?.itemType !== 'note') {
    notebookStore.setHasUnsavedChanges(false)
    return
  }
  notebookStore.setHasUnsavedChanges(isDirty())
}

function requestLeaveConfirm() {
  if (!isDirty()) return Promise.resolve(true)
  leaveDialogVisible.value = true
  return new Promise((resolve) => {
    pendingLeaveResolve = resolve
  })
}

async function handleLeaveSave() {
  leaveDialogVisible.value = false
  const ok = await saveNote({ force: true })
  pendingLeaveResolve?.(ok)
  pendingLeaveResolve = null
}

function handleLeaveDiscard() {
  leaveDialogVisible.value = false
  editTitle.value = lastSavedTitle.value
  editContent.value = lastSavedContent.value
  saveStatus.value = 'saved'
  notebookStore.setHasUnsavedChanges(false)
  pendingLeaveResolve?.(true)
  pendingLeaveResolve = null
}

function handleLeaveCancel() {
  leaveDialogVisible.value = false
  pendingLeaveResolve?.(false)
  pendingLeaveResolve = null
}

function onBeforeUnload(e) {
  if (notebookStore.hasUnsavedChanges) {
    e.preventDefault()
    e.returnValue = ''
  }
}

function clearAutoSaveTimer() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
}

function scheduleAutoSave() {
  clearAutoSaveTimer()
  if (!currentItem.value || currentItem.value.itemType !== 'note') return
  if (!isDirty()) {
    saveStatus.value = 'saved'
    syncUnsavedState()
    return
  }
  saveStatus.value = 'dirty'
  syncUnsavedState()
  autoSaveTimer = setTimeout(() => {
    performAutoSave()
  }, AUTO_SAVE_DELAY)
}

function markDirty() {
  if (isLoadingItem || currentItem.value?.itemType !== 'note') return
  scheduleAutoSave()
}

async function performAutoSave() {
  if (!currentItem.value || currentItem.value.itemType !== 'note') return
  if (!isDirty()) {
    saveStatus.value = 'saved'
    return
  }
  await saveNote()
}

async function saveNote(options = {}) {
  const { manual = false, force = false } = options
  if (!currentItem.value || currentItem.value.itemType !== 'note') return false
  if (!force && !isDirty()) {
    saveStatus.value = 'saved'
    return true
  }
  if (saving.value) {
    scheduleAutoSave()
    return false
  }

  saving.value = true
  saveStatus.value = 'saving'
  clearAutoSaveTimer()
  try {
    await notebookStore.saveCurrentNote({
      name: editTitle.value,
      content: editContent.value,
    })
    lastSavedTitle.value = editTitle.value
    lastSavedContent.value = editContent.value
    saveStatus.value = 'saved'
    syncUnsavedState()
    if (manual) {
      message.value = '保存成功'
      setTimeout(() => { message.value = '' }, 2000)
    }
    return true
  } catch (err) {
    saveStatus.value = 'error'
    syncUnsavedState()
    if (manual) message.value = err.message
    scheduleAutoSave()
    return false
  } finally {
    saving.value = false
  }
}

function resolveFileUrl(url) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function rewriteContentImages(html) {
  if (!html) return ''
  let result = html
  for (const file of attachments.value) {
    const signedUrl = resolveFileUrl(file.url)
    if (!signedUrl) continue
    const filename = file.storagePath?.replace(/^\/uploads\//, '') || file.fileName
    if (filename) {
      result = result.replace(
        new RegExp(`/uploads/${escapeRegExp(filename)}(?:\\?[^"'\\s>]*)?`, 'g'),
        signedUrl,
      )
    }
    if (file.id) {
      result = result.replace(
        new RegExp(`/api/items/attachments/${file.id}/file[^"'\\s>]*`, 'g'),
        signedUrl,
      )
    }
  }
  return result
}

function isImageFile(file) {
  return file.fileType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.fileName || '')
}

function formatFileSize(size) {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function normalizeImageUrl(url) {
  if (!url) return ''
  try {
    return (url.startsWith('http') ? new URL(url).pathname : url).split('?')[0]
  } catch {
    return url.split('?')[0]
  }
}

function findAttachmentBySrc(src) {
  const target = normalizeImageUrl(resolveFileUrl(src))
  return attachments.value.find((a) => normalizeImageUrl(resolveFileUrl(a.url)) === target)
}

function clearImageSelection() {
  const editor = contentEditorRef.value
  editor?.querySelectorAll('.content-img-selected').forEach((el) => el.classList.remove('content-img-selected'))
  editor?.querySelectorAll('.content-img-wrap-selected').forEach((el) => el.classList.remove('content-img-wrap-selected'))
  selectedImageEl = null
}

function selectEditorImage(img) {
  if (!img) return
  clearImageSelection()
  selectedImageEl = img
  img.classList.add('content-img-selected')
  const wrap = img.closest('.content-img-wrap')
  wrap?.classList.add('content-img-wrap-selected')

  const editor = contentEditorRef.value
  if (!editor?.contains(img)) return

  editor.focus()
  const range = document.createRange()
  range.selectNode(wrap || img)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  savedSelection = range.cloneRange()
}

function handleEditorMouseDown(e) {
  if (e.button !== 0) return
  const img = e.target.closest('img.content-img')
  const wrap = e.target.closest('.content-img-wrap')
  if (img || wrap) {
    e.preventDefault()
    const targetImg = img || wrap?.querySelector('img.content-img')
    if (targetImg) selectEditorImage(targetImg)
  } else if (!e.target.closest('.img-ctx-menu')) {
    clearImageSelection()
  }
}

function handleContentContextMenu(e) {
  const img = e.target.closest('img.content-img')
  if (!img) return
  e.preventDefault()
  selectEditorImage(img)
  imgContextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || '',
    imgEl: img,
  }
}

function closeImgContextMenu() {
  imgContextMenu.value.visible = false
}

function handleViewEditorImage() {
  const { src, alt } = imgContextMenu.value
  closeImgContextMenu()
  imagePreview.value = {
    visible: true,
    src: resolveFileUrl(src),
    alt,
  }
}

function closeImagePreview() {
  imagePreview.value.visible = false
}

function removeImageFromContentBySrc(src) {
  const target = normalizeImageUrl(resolveFileUrl(src))
  const temp = document.createElement('div')
  temp.innerHTML = editContent.value
  temp.querySelectorAll('img.content-img').forEach((img) => {
    if (normalizeImageUrl(resolveFileUrl(img.getAttribute('src'))) === target) {
      img.remove()
    }
  })
  editContent.value = temp.innerHTML
  if (isEditing.value) {
    nextTick(syncEditorFromContent)
  }
  pushHistory()
  markDirty()
}

async function handleDeleteEditorImage() {
  const { src, imgEl } = imgContextMenu.value
  closeImgContextMenu()
  if (!confirm('确定从笔记中删除该图片吗？')) return

  if (isEditing.value && imgEl?.parentNode) {
    imgEl.remove()
    handleEditorInput()
  } else {
    removeImageFromContentBySrc(src)
  }

  const attachment = findAttachmentBySrc(src)
  if (attachment) {
    try {
      await deleteAttachment(attachment.id)
      await loadAttachments()
    } catch (err) {
      message.value = err.message || '附件删除失败'
      setTimeout(() => { message.value = '' }, 2000)
    }
  }
}

function onDocumentClick(e) {
  closeImgContextMenu()
  const inEditor = e.target.closest('.content-editor')
  const inToolbar = e.target.closest('.toolbar')
  if (!inEditor && !inToolbar) {
    clearImageSelection()
  }
}

function onDocumentKeydown(e) {
  if (e.key === 'Escape') {
    closeImgContextMenu()
    closeImagePreview()
  }
}

const renderedPreview = computed(() => ensureImageWrappers(rewriteContentImages(contentToHtml(editContent.value))))

function isHtmlContent(text) {
  return /<[a-z][\s\S]*>/i.test(text || '')
}

function contentToHtml(content) {
  if (!content) return ''
  if (isHtmlContent(content)) return content
  return markdownToEditorHtml(content)
}

function markdownToEditorHtml(text) {
  const escaped = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      const src = resolveFileUrl(url.trim())
      const safeAlt = alt.replace(/"/g, '&quot;')
      return `<img src="${src}" alt="${safeAlt}" class="content-img" loading="lazy" />`
    })
    .replace(/\n/g, '<br>')
}

function ensureImageWrappers(html) {
  const temp = document.createElement('div')
  temp.innerHTML = html
  temp.querySelectorAll('img.content-img').forEach((img) => {
    let wrap = img.closest('.content-img-wrap')
    if (!wrap) {
      wrap = document.createElement('div')
      wrap.className = 'content-img-wrap align-left'
      img.parentNode.insertBefore(wrap, img)
      wrap.appendChild(img)
    }
    wrap.setAttribute('contenteditable', 'false')
  })
  return temp.innerHTML
}

function syncEditorFromContent() {
  const el = contentEditorRef.value
  if (!el || !isEditing.value) return
  clearImageSelection()
  el.innerHTML = ensureImageWrappers(rewriteContentImages(contentToHtml(editContent.value)))
}

function syncContentFromEditor() {
  const el = contentEditorRef.value
  if (!el) return
  isEditorInput = true
  editContent.value = el.innerHTML
  isEditorInput = false
}

function handleEditorInput() {
  syncContentFromEditor()
  pushHistory()
  markDirty()
}

function focusEditorWithSelection() {
  const editor = contentEditorRef.value
  if (!editor) return false
  editor.focus()
  if (savedSelection) {
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedSelection)
  }
  return true
}

function handleFormatMouseDown() {
  saveEditorSelection()
}

function pushHistory() {
  if (isApplyingHistory) return
  const snapshot = { title: editTitle.value, content: editContent.value }
  const last = history.value[historyIndex.value]
  if (last && last.title === snapshot.title && last.content === snapshot.content) {
    return
  }
  history.value = history.value.slice(0, historyIndex.value + 1)
  history.value.push(snapshot)
  historyIndex.value = history.value.length - 1
}

function handleEditorBlur(e) {
  if (isApplyingHistory) return
  const related = e.relatedTarget
  if (related?.closest?.('.toolbar')) return
  pushHistory()
}

function wrapSelectionWithTag(tagName) {
  const sel = window.getSelection()
  if (!sel.rangeCount || sel.isCollapsed) return false
  const range = sel.getRangeAt(0)
  const el = document.createElement(tagName)
  try {
    range.surroundContents(el)
  } catch {
    const fragment = range.extractContents()
    el.appendChild(fragment)
    range.insertNode(el)
  }
  range.selectNodeContents(el)
  sel.removeAllRanges()
  sel.addRange(range)
  return true
}

function execEditorCommand(command, value = null) {
  const editor = contentEditorRef.value
  if (!editor || !isEditing.value) return

  editor.focus()
  const sel = window.getSelection()
  if (savedSelection) {
    try {
      sel.removeAllRanges()
      sel.addRange(savedSelection)
    } catch {
      savedSelection = null
    }
  }

  document.execCommand('styleWithCSS', false, false)
  let ok = document.execCommand(command, false, value)
  if (!ok && (command === 'italic' || command === 'bold') && sel.rangeCount > 0 && !sel.isCollapsed) {
    ok = wrapSelectionWithTag(command === 'italic' ? 'em' : 'strong')
  }

  savedSelection = null
  if (ok || command === 'foreColor') {
    handleEditorInput()
  }
}

function getSelectedImage(editor) {
  if (selectedImageEl && editor?.contains(selectedImageEl)) {
    return selectedImageEl
  }
  const sel = window.getSelection()
  if (!sel.rangeCount || !editor) return null
  let node = sel.anchorNode
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement
  if (node?.nodeName === 'IMG' && node.classList?.contains('content-img')) return node
  return node?.closest?.('img.content-img') || null
}

function applyTextOrImageAlignment(command) {
  const alignMap = {
    justifyLeft: 'left',
    justifyCenter: 'center',
    justifyRight: 'right',
  }
  const align = alignMap[command]
  if (!align || !focusEditorWithSelection()) return

  const editor = contentEditorRef.value
  const img = getSelectedImage(editor)
  if (img) {
    let wrap = img.closest('.content-img-wrap')
    if (!wrap) {
      wrap = document.createElement('div')
      wrap.className = 'content-img-wrap'
      wrap.setAttribute('contenteditable', 'false')
      img.parentNode.insertBefore(wrap, img)
      wrap.appendChild(img)
    }
    wrap.classList.remove('align-left', 'align-center', 'align-right')
    wrap.classList.add(`align-${align}`)
    savedSelection = null
    handleEditorInput()
    return
  }

  document.execCommand(command, false, null)
  savedSelection = null
  handleEditorInput()
}

function applyFontSize(size) {
  const editor = contentEditorRef.value
  if (!editor) return
  editor.focus()
  if (savedSelection) {
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedSelection)
  }
  const sel = window.getSelection()
  if (!sel.rangeCount) return
  const range = sel.getRangeAt(0)
  const span = document.createElement('span')
  span.style.fontSize = `${size}px`
  if (range.collapsed) {
    span.appendChild(document.createTextNode('\u200B'))
    range.insertNode(span)
    range.setStart(span.firstChild, 1)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  } else {
    try {
      range.surroundContents(span)
    } catch {
      const fragment = range.extractContents()
      span.appendChild(fragment)
      range.insertNode(span)
    }
  }
  savedSelection = null
  handleEditorInput()
}

function handleColorChange(e) {
  execEditorCommand('foreColor', e.target.value)
}

function handleFontSizeChange(e) {
  const size = e.target.value
  if (!size) return
  applyFontSize(Number(size))
  e.target.value = ''
}

function saveEditorSelection() {
  const sel = window.getSelection()
  const editor = contentEditorRef.value
  if (sel.rangeCount > 0 && editor?.contains(sel.anchorNode)) {
    savedSelection = sel.getRangeAt(0).cloneRange()
  } else {
    savedSelection = null
  }
}

function insertImageInEditor(url, alt) {
  const editor = contentEditorRef.value
  if (!editor) return

  editor.focus()
  const sel = window.getSelection()
  if (savedSelection) {
    sel.removeAllRanges()
    sel.addRange(savedSelection)
  }

  const img = document.createElement('img')
  img.src = url
  img.alt = alt
  img.className = 'content-img'

  const wrap = document.createElement('div')
  wrap.className = 'content-img-wrap align-left'
  wrap.setAttribute('contenteditable', 'false')
  wrap.appendChild(img)

  const range = sel.rangeCount > 0
    ? sel.getRangeAt(0)
    : (() => {
        const r = document.createRange()
        r.selectNodeContents(editor)
        r.collapse(false)
        return r
      })()

  range.deleteContents()

  const brBefore = document.createElement('br')
  const brAfter = document.createElement('br')
  range.insertNode(brAfter)
  range.insertNode(wrap)
  range.insertNode(brBefore)

  range.setStartAfter(brAfter)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)

  isEditorInput = true
  editContent.value = editor.innerHTML
  pushHistory()
  isEditorInput = false
  savedSelection = null
  markDirty()
}

async function loadAttachments() {
  if (!currentItem.value || currentItem.value.itemType !== 'note') {
    attachments.value = []
    return
  }
  attachmentsLoading.value = true
  try {
    attachments.value = await getAttachments(currentItem.value.id)
  } catch {
    attachments.value = []
  } finally {
    attachmentsLoading.value = false
  }
}

async function ensureNoteSaved() {
  if (!isDirty() && currentItem.value?.isSaved) return
  await saveNote({ force: true })
}

watch(currentItem, async (item, oldItem) => {
  if (oldItem?.itemType === 'note' && isDirty()) {
    clearAutoSaveTimer()
    await saveNote()
  }

  clearAutoSaveTimer()
  isLoadingItem = true

  if (item?.itemType === 'note') {
    editTitle.value = item.name || ''
    editContent.value = item.content || ''
    lastSavedTitle.value = editTitle.value
    lastSavedContent.value = editContent.value
    saveStatus.value = 'saved'
    history.value = [{ title: editTitle.value, content: editContent.value }]
    historyIndex.value = 0
    isEditing.value = true
    await loadAttachments()
    await nextTick()
    syncEditorFromContent()
    if (notebookStore.pendingRenameItemId === item.id) {
      await nextTick()
      titleInputRef.value?.focus()
      titleInputRef.value?.select()
      notebookStore.pendingRenameItemId = null
    }
  } else if (item?.itemType === 'folder') {
    attachments.value = []
    folderName.value = item.name || ''
    saveStatus.value = 'saved'
    if (notebookStore.pendingRenameItemId === item.id) {
      await nextTick()
      folderNameInputRef.value?.focus()
      folderNameInputRef.value?.select()
      notebookStore.pendingRenameItemId = null
    }
  }

  isLoadingItem = false
  syncUnsavedState()
}, { immediate: true })

watch(editTitle, () => {
  markDirty()
})

function handleEditorMouseUp() {
  saveEditorSelection()
}

function handleEditorKeyUp() {
  saveEditorSelection()
}

function handleUndo() {
  if (historyIndex.value <= 0) return
  isApplyingHistory = true
  historyIndex.value--
  const snap = history.value[historyIndex.value]
  editTitle.value = snap.title
  editContent.value = snap.content
  nextTick(() => {
    syncEditorFromContent()
    syncUnsavedState()
    isApplyingHistory = false
  })
}

function handleRedo() {
  if (historyIndex.value >= history.value.length - 1) return
  isApplyingHistory = true
  historyIndex.value++
  const snap = history.value[historyIndex.value]
  editTitle.value = snap.title
  editContent.value = snap.content
  nextTick(() => {
    syncEditorFromContent()
    syncUnsavedState()
    isApplyingHistory = false
  })
}

function handleEditToggle() {
  isEditing.value = !isEditing.value
  if (isEditing.value) {
    nextTick(syncEditorFromContent)
  }
}

async function handleSave() {
  if (!currentItem.value) return
  message.value = ''
  pushHistory()
  const ok = await saveNote({ manual: true, force: true })
  if (ok) await loadAttachments()
}

async function handleToggleFavorite() {
  if (!currentItem.value) return
  try {
    await notebookStore.toggleFavorite(currentItem.value.id)
    message.value = isFavorite.value ? '已加入收藏' : '已取消收藏'
    toastSuccess(message.value)
    setTimeout(() => { message.value = '' }, 2000)
  } catch (err) {
    toastError(err.message || '操作失败')
  }
}

async function handleShare() {
  if (!canShare.value) {
    toastWarning('请先保存笔记后再分享')
    return
  }
  try {
    const result = await shareNote(currentItem.value.id)
    const url = `${window.location.origin}/share/${result.shareToken}`
    await navigator.clipboard.writeText(url)
    toastSuccess('分享链接已复制到剪贴板')
  } catch (err) {
    toastError(err.message)
  }
}

function handleInsertImage() {
  saveEditorSelection()
  imageInput.value?.click()
}

async function handleImageChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    await ensureNoteSaved()
    const result = await uploadAttachment(currentItem.value.id, file)
    const url = resolveFileUrl(result.url)
    insertImageInEditor(url, file.name)
    await loadAttachments()
    markDirty()
    message.value = `图片「${file.name}」已插入`
    setTimeout(() => { message.value = '' }, 2000)
  } catch (err) {
    message.value = err.message || '图片上传失败'
  }
  e.target.value = ''
}

function handleAttachment() {
  fileInput.value?.click()
}

async function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    await ensureNoteSaved()
    await uploadAttachment(currentItem.value.id, file)
    await loadAttachments()
    markDirty()
    message.value = `附件「${file.name}」上传成功`
    setTimeout(() => { message.value = '' }, 2000)
  } catch (err) {
    message.value = err.message || '附件上传失败'
  }
  e.target.value = ''
}

async function handleRemoveAttachment(id) {
  if (!confirm('确定删除该附件吗？')) return
  try {
    await deleteAttachment(id)
    await loadAttachments()
    markDirty()
    message.value = '附件已删除'
    setTimeout(() => { message.value = '' }, 2000)
  } catch (err) {
    message.value = err.message || '删除失败'
  }
}

function formatSavedTime(dateStr) {
  if (!dateStr) return '未保存'
  const d = new Date(dateStr)
  const diff = Date.now() - d
  if (diff < 60000) return '刚刚'
  return d.toLocaleString('zh-CN')
}

async function handleFolderRename() {
  if (!currentItem.value || !folderName.value.trim()) return
  saving.value = true
  message.value = ''
  try {
    await notebookStore.renameItem(currentItem.value.id, folderName.value.trim())
    message.value = '文件夹已保存'
    setTimeout(() => { message.value = '' }, 2000)
  } catch (err) {
    message.value = err.message
  } finally {
    saving.value = false
  }
}

function handleDelete() {
  const item = currentItem.value
  if (!item) return
  emit('delete-item', {
    id: item.id,
    name: item.name,
    itemType: item.itemType,
  })
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
  notebookStore.registerEditorActions({ requestLeave: requestLeaveConfirm })
})

onBeforeUnmount(() => {
  clearAutoSaveTimer()
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  notebookStore.unregisterEditorActions()
})
</script>

<template>
  <div class="editor-panel">
    <template v-if="currentItem && currentItem.itemType === 'note'">
      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="toolbar-row">
          <button class="tool-btn primary" :disabled="saving" @click="handleSave">
            💾 保存
          </button>
          <button class="tool-btn" @click="handleEditToggle">
            ✏️ {{ isEditing ? '预览' : '编辑' }}
          </button>
          <button class="tool-btn" @mousedown.prevent @click="handleUndo">↩ 撤销</button>
          <button class="tool-btn" @mousedown.prevent @click="handleRedo">↪ 恢复</button>
          <button class="tool-btn" :class="{ active: isFavorite }" @click="handleToggleFavorite">
            {{ isFavorite ? '★' : '☆' }} 收藏
          </button>
          <button class="tool-btn" :class="{ disabled: !canShare }" @click="handleShare">
            🔗 分享
          </button>
          <button class="tool-btn" @click="handleInsertImage">🖼 插入图片</button>
          <button class="tool-btn" @click="handleAttachment">📎 附件</button>
          <button class="tool-btn danger" @click="handleDelete">🗑 删除</button>

          <template v-if="isEditing">
            <span class="toolbar-divider" />
            <button type="button" class="fmt-btn" title="加粗" @mousedown.prevent="handleFormatMouseDown" @click="execEditorCommand('bold')">
              <strong>B</strong>
            </button>
            <button type="button" class="fmt-btn" title="倾斜" @mousedown.prevent="handleFormatMouseDown" @click="execEditorCommand('italic')">
              <em>I</em>
            </button>
            <span class="fmt-divider" />
            <button type="button" class="fmt-btn" title="左对齐" @mousedown.prevent="handleFormatMouseDown" @click="applyTextOrImageAlignment('justifyLeft')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 10h10M4 14h16M4 18h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button type="button" class="fmt-btn" title="居中对齐" @mousedown.prevent="handleFormatMouseDown" @click="applyTextOrImageAlignment('justifyCenter')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 10h10M4 14h16M8 18h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <button type="button" class="fmt-btn" title="右对齐" @mousedown.prevent="handleFormatMouseDown" @click="applyTextOrImageAlignment('justifyRight')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M10 10h10M4 14h16M12 18h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <span class="fmt-divider" />
            <label class="fmt-color" title="字体颜色" @mousedown.prevent="handleFormatMouseDown">
              <span class="fmt-color-icon" :style="{ color: fontColor }">A</span>
              <input type="color" v-model="fontColor" class="fmt-color-input" @input="handleColorChange" />
            </label>
            <select class="fmt-select" title="字体大小" @mousedown="handleFormatMouseDown" @change="handleFontSizeChange">
              <option value="">字号</option>
              <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
            </select>
          </template>

          <span v-if="message" class="save-msg">{{ message }}</span>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="content-area">
        <div class="title-row">
          <input
            v-if="isEditing"
            ref="titleInputRef"
            v-model="editTitle"
            class="title-input"
            placeholder="笔记标题"
            @blur="pushHistory"
          />
          <h1 v-else class="title-display">{{ editTitle || '无标题' }}</h1>
          <span class="save-status" :class="saveStatus">{{ saveStatusText }}</span>
        </div>

        <div class="editor-body">
          <div
            v-if="isEditing"
            ref="contentEditorRef"
            class="content-editor"
            contenteditable="true"
            @input="handleEditorInput"
            @blur="handleEditorBlur"
            @mouseup="handleEditorMouseUp"
            @keyup="handleEditorKeyUp"
            @mousedown="handleEditorMouseDown"
            @contextmenu="handleContentContextMenu"
          />
          <div
            v-else
            class="content-preview"
            v-html="renderedPreview"
            @contextmenu="handleContentContextMenu"
          />
        </div>

        <section v-if="attachments.length || attachmentsLoading" class="attachments-section">
          <h4 class="attachments-title">
            📎 附件列表
            <span v-if="!attachmentsLoading">({{ attachments.length }})</span>
          </h4>
          <p v-if="attachmentsLoading" class="attachments-empty">加载中...</p>
          <ul v-else class="attachments-list">
            <li v-for="file in attachments" :key="file.id" class="attachment-item">
              <div v-if="isImageFile(file)" class="attachment-image-wrap">
                <img :src="resolveFileUrl(file.url)" :alt="file.fileName" class="attachment-thumb" />
              </div>
              <span v-else class="attachment-icon">📄</span>
              <div class="attachment-info">
                <a :href="resolveFileUrl(file.url)" target="_blank" rel="noopener" class="attachment-name">
                  {{ file.fileName }}
                </a>
                <span class="attachment-meta">{{ formatFileSize(file.fileSize) }}</span>
              </div>
              <button type="button" class="attachment-del" title="删除附件" @click="handleRemoveAttachment(file.id)">
                ×
              </button>
            </li>
          </ul>
        </section>
        <section v-else class="attachments-section attachments-empty-section">
          <p class="attachments-empty">暂无附件，可通过「插入图片」或「附件」按钮上传</p>
        </section>
      </div>

      <!-- 状态栏 -->
      <div class="status-bar">
        <span>📄 最后保存: {{ formatSavedTime(currentItem.lastSavedAt) }}</span>
        <span>📊 字数: {{ wordCount }}</span>
        <span>📍 当前笔记位置: {{ currentItem.breadcrumb || currentItem.name }}</span>
      </div>
    </template>

    <div v-else-if="currentItem && currentItem.itemType === 'folder'" class="folder-panel">
      <div class="folder-toolbar">
        <button class="tool-btn primary" :disabled="saving" @click="handleFolderRename">
          💾 保存名称
        </button>
        <button class="tool-btn danger" @click="handleDelete">🗑 删除</button>
        <span v-if="message" class="save-msg">{{ message }}</span>
      </div>
      <div class="folder-content">
        <span class="folder-icon">📁</span>
        <input
          ref="folderNameInputRef"
          v-model="folderName"
          class="folder-name-input"
          placeholder="文件夹名称"
          @keyup.enter="handleFolderRename"
        />
        <p class="hint">在此修改文件夹名称，点击左侧 + 或右键在此文件夹下新建内容</p>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>未选中任何内容</p>
    </div>

    <input ref="imageInput" type="file" accept="image/*" hidden @change="handleImageChange" />
    <input ref="fileInput" type="file" hidden @change="handleFileChange" />

    <Teleport to="body">
      <div
        v-if="imgContextMenu.visible"
        class="img-ctx-menu"
        :style="{ left: `${imgContextMenu.x}px`, top: `${imgContextMenu.y}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <button type="button" @click="handleViewEditorImage">🖼 查看图片</button>
        <button type="button" class="danger" @click="handleDeleteEditorImage">🗑 删除图片</button>
      </div>

      <div v-if="imagePreview.visible" class="image-preview-overlay" @click="closeImagePreview">
        <div class="image-preview-box" @click.stop>
          <button type="button" class="image-preview-close" @click="closeImagePreview">×</button>
          <img :src="imagePreview.src" :alt="imagePreview.alt" class="image-preview-img" />
          <p v-if="imagePreview.alt" class="image-preview-caption">{{ imagePreview.alt }}</p>
        </div>
      </div>
    </Teleport>

    <UnsavedChangesDialog
      :visible="leaveDialogVisible"
      @save="handleLeaveSave"
      @discard="handleLeaveDiscard"
      @cancel="handleLeaveCancel"
    />
  </div>
</template>

<style scoped>
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  overflow: hidden;
}

.toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 2px;
  flex-shrink: 0;
}

.tool-btn {
  padding: 5px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
  transition: all 0.15s;
}

.tool-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
}

.tool-btn.primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.tool-btn.primary:hover {
  background: #1d4ed8;
}

.tool-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-btn.active {
  background: #fef3c7;
  border-color: #fbbf24;
  color: #b45309;
}

.tool-btn.danger {
  color: #ef4444;
  border-color: #fecaca;
}

.tool-btn.danger:hover {
  background: #fef2f2;
  border-color: #ef4444;
  color: #dc2626;
}

.save-msg {
  font-size: 13px;
  color: #22c55e;
  margin-left: 4px;
}

.fmt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.fmt-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
  background: #f8fafc;
}

.fmt-btn strong,
.fmt-btn em {
  font-size: 14px;
  font-style: normal;
  font-weight: 700;
}

.fmt-btn em {
  font-style: italic;
  font-weight: 600;
}

.fmt-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 2px;
}

.fmt-color {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}

.fmt-color:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.fmt-color-icon {
  font-weight: 700;
  font-size: 15px;
  line-height: 1;
}

.fmt-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.fmt-select {
  height: 30px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  outline: none;
}

.fmt-select:hover,
.fmt-select:focus {
  border-color: #2563eb;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.title-input {
  flex: 1;
  min-width: 200px;
  border: none;
  font-size: 28px;
  font-weight: 600;
  color: #1e293b;
  outline: none;
  margin-bottom: 0;
  font-family: inherit;
}

.title-display {
  flex: 1;
  min-width: 200px;
  font-size: 28px;
  margin: 0;
}

.save-status {
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
}

.save-status.saved {
  color: #94a3b8;
}

.save-status.dirty {
  color: #f59e0b;
}

.save-status.saving {
  color: #2563eb;
}

.save-status.error {
  color: #ef4444;
}

.editor-body {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  min-height: 300px;
}

.content-textarea,
.content-editor {
  width: 100%;
  min-height: 300px;
  padding: 16px;
  border: none;
  outline: none;
  font-size: 15px;
  line-height: 1.8;
  font-family: inherit;
  box-sizing: border-box;
}

.content-editor:empty::before {
  content: '开始编写你的笔记...';
  color: #9ca3af;
  pointer-events: none;
}

.content-preview {
  padding: 16px;
  font-size: 15px;
  line-height: 1.8;
  color: #374151;
}

.content-editor :deep(.content-img-wrap),
.content-preview :deep(.content-img-wrap) {
  width: 100%;
  margin: 12px 0;
}

.content-editor :deep(.content-img-wrap) {
  cursor: pointer;
}

.content-editor :deep(.content-img-wrap-selected .content-img),
.content-editor :deep(.content-img-selected) {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-color: #2563eb;
}

.content-editor :deep(.content-img),
.content-preview :deep(.content-img) {
  display: block;
  max-width: 100%;
  margin: 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.content-editor :deep(.content-img) {
  cursor: pointer;
  pointer-events: auto;
}

.content-preview :deep(.content-img) {
  cursor: context-menu;
}

.content-editor :deep(.content-img-wrap.align-center .content-img),
.content-preview :deep(.content-img-wrap.align-center .content-img) {
  margin-left: auto;
  margin-right: auto;
}

.content-editor :deep(.content-img-wrap.align-right .content-img),
.content-preview :deep(.content-img-wrap.align-right .content-img) {
  margin-left: auto;
  margin-right: 0;
}

.content-editor :deep(.content-img-wrap.align-left .content-img),
.content-preview :deep(.content-img-wrap.align-left .content-img) {
  margin-left: 0;
  margin-right: auto;
}

.content-editor :deep(em),
.content-editor :deep(i),
.content-preview :deep(em),
.content-preview :deep(i) {
  font-style: italic;
}

.content-editor :deep(strong),
.content-editor :deep(b),
.content-preview :deep(strong),
.content-preview :deep(b) {
  font-weight: 700;
}

.attachments-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.attachments-title {
  margin: 0 0 12px;
  font-size: 15px;
  color: #334155;
  font-weight: 600;
}

.attachments-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}

.attachment-image-wrap {
  flex-shrink: 0;
}

.attachment-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.attachment-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 48px;
  text-align: center;
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  display: block;
  font-size: 14px;
  color: #2563eb;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-name:hover {
  text-decoration: underline;
}

.attachment-meta {
  font-size: 12px;
  color: #94a3b8;
}

.attachment-del {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #ef4444;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.attachment-del:hover {
  background: #fef2f2;
}

.attachments-empty-section {
  border-top: none;
  padding-top: 0;
}

.attachments-empty {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
  gap: 8px;
  flex-wrap: wrap;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.empty-state h2 {
  font-size: 24px;
  margin-bottom: 16px;
}

.welcome-box {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px 32px;
  max-width: 480px;
  text-align: left;
}

.welcome-box ul {
  margin: 12px 0 0;
  padding-left: 20px;
  line-height: 2;
}

.hint {
  font-size: 14px;
  color: #9ca3af;
  margin-top: 8px;
}

.folder-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.folder-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 12px;
}

.folder-content {
  flex: 1;
  padding: 40px 32px;
}

.folder-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.folder-name-input {
  width: 100%;
  max-width: 480px;
  padding: 12px 16px;
  font-size: 24px;
  font-weight: 600;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
  color: #1e293b;
}

.folder-name-input:focus {
  border-color: #2563eb;
}

.img-ctx-menu {
  position: fixed;
  z-index: 4000;
  min-width: 140px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  padding: 4px 0;
}

.img-ctx-menu button {
  display: block;
  width: 100%;
  padding: 9px 14px;
  border: none;
  background: none;
  text-align: left;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.img-ctx-menu button:hover {
  background: #f3f4f6;
}

.img-ctx-menu button.danger {
  color: #ef4444;
}

.img-ctx-menu button.danger:hover {
  background: #fef2f2;
}

.image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.image-preview-box {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-preview-close {
  position: absolute;
  top: -36px;
  right: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 0.35);
}

.image-preview-img {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
  background: #fff;
}

.image-preview-caption {
  margin: 12px 0 0;
  color: #e2e8f0;
  font-size: 14px;
  text-align: center;
}

@media (max-width: 768px) {
  .toolbar {
    padding: 8px 12px;
  }

  .tool-btn {
    padding: 5px 8px;
    font-size: 12px;
  }

  .title-row {
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px 0;
  }

  .title-input,
  .title-display {
    font-size: 20px;
  }

  .content-editor,
  .content-preview {
    padding: 12px;
    font-size: 14px;
  }

  .status-bar {
    flex-wrap: wrap;
    gap: 6px 12px;
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>

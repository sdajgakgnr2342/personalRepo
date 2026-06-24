<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useNotebookStore } from '@/stores/notebook'
import { shareNote, uploadAttachment, getAttachments, deleteAttachment } from '@/api/item'
import { toastSuccess, toastError, toastWarning, toastInfo, toastProgress, updateToast, dismiss } from '@/utils/toast'
import { resolveUploadError, MAX_ATTACHMENT_SIZE, MAX_ATTACHMENT_SIZE_LABEL } from '@/utils/upload'
import { ATTACHMENT_ACCEPT, isAllowedAttachmentFile, getAttachmentTypeError } from '@/config/attachmentTypes'
import {
  EDITOR_IMAGE_MAX_WIDTH,
  EDITOR_IMAGE_MIN_WIDTH,
  EDITOR_IMAGE_PASTE_MAX_WIDTH,
  EDITOR_IMAGE_PASTE_QUALITY,
} from '@/config/editor'
import { resizeImageFile } from '@/utils/image'
import { copyTextToClipboard } from '@/utils/clipboard'
import UnsavedChangesDialog from './UnsavedChangesDialog.vue'
import WechatConfirmDialog from './WechatConfirmDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'

const notebookStore = useNotebookStore()

const emit = defineEmits(['delete-item'])

const editTitle = ref('')
const editContent = ref('')
const folderName = ref('')
const isEditing = ref(true)
const isEditingTitle = ref(false)
const titleBeforeEdit = ref('')
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
const isUploading = ref(false)
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
const imageResizeBar = ref({
  visible: false,
  left: 0,
  top: 0,
  width: 0,
  value: EDITOR_IMAGE_MAX_WIDTH,
  min: EDITOR_IMAGE_MIN_WIDTH,
  max: EDITOR_IMAGE_MAX_WIDTH,
})
let lastTouchTime = 0
const leaveDialogVisible = ref(false)
const clearDialogVisible = ref(false)
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
  const { manual = false, force = false, status, draft = false } = options
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
    const payload = {
      name: editTitle.value,
      content: editContent.value,
    }
    if (draft || status === 'draft') {
      payload.status = 'draft'
    }
    await notebookStore.saveCurrentNote(payload)
    lastSavedTitle.value = editTitle.value
    lastSavedContent.value = editContent.value
    saveStatus.value = 'saved'
    syncUnsavedState()
    if (manual) {
      toastSuccess(draft ? '已保存为草稿' : '保存成功')
    } else if (draft) {
      toastSuccess('已保存为草稿')
    }
    return true
  } catch (err) {
    saveStatus.value = 'error'
    syncUnsavedState()
    if (manual) toastError(err.message || '保存失败')
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

    const stableUrl = resolveFileUrl(file.storagePath)
    if (stableUrl.startsWith('http://') || stableUrl.startsWith('https://')) {
      result = result.replace(new RegExp(escapeRegExp(stableUrl), 'g'), signedUrl)
    }

    const filename = file.storagePath?.replace(/^\/uploads\//, '') || file.fileName
    if (filename && !stableUrl.startsWith('http')) {
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
  imageResizeBar.value.visible = false
}

function getEditorImageMaxWidth(img) {
  const editor = contentEditorRef.value
  const padding = 32
  const containerWidth = editor?.clientWidth ? editor.clientWidth - padding : EDITOR_IMAGE_MAX_WIDTH
  const cap = Math.min(Math.max(containerWidth, EDITOR_IMAGE_MIN_WIDTH), EDITOR_IMAGE_MAX_WIDTH)
  if (img?.naturalWidth) {
    return Math.min(cap, img.naturalWidth)
  }
  return cap
}

function getImageDisplayWidth(img) {
  if (!img) return EDITOR_IMAGE_MAX_WIDTH
  const styleWidth = parseInt(img.style.width, 10)
  if (styleWidth > 0) return styleWidth
  const rectWidth = img.getBoundingClientRect().width
  if (rectWidth > 0) return Math.round(rectWidth)
  return getEditorImageMaxWidth(img)
}

function applyImageWidth(img, width, { commit = false } = {}) {
  if (!img) return
  const maxW = getEditorImageMaxWidth(img)
  const clamped = Math.max(EDITOR_IMAGE_MIN_WIDTH, Math.min(Math.round(width), maxW))
  img.style.width = `${clamped}px`
  img.style.height = 'auto'
  if (commit) handleEditorInput()
}

function updateImageResizeBar() {
  if (!selectedImageEl || !isEditing.value) {
    imageResizeBar.value.visible = false
    return
  }
  const wrap = selectedImageEl.closest('.content-img-wrap') || selectedImageEl
  const rect = wrap.getBoundingClientRect()
  imageResizeBar.value = {
    visible: true,
    left: rect.left,
    top: rect.bottom + 4,
    width: Math.max(rect.width, 120),
    value: getImageDisplayWidth(selectedImageEl),
    min: EDITOR_IMAGE_MIN_WIDTH,
    max: getEditorImageMaxWidth(selectedImageEl),
  }
}

function handleImageResizeBarInput() {
  if (!selectedImageEl) return
  applyImageWidth(selectedImageEl, imageResizeBar.value.value)
  nextTick(updateImageResizeBar)
}

function handleImageResizeBarChange() {
  handleImageResizeBarInput()
  handleEditorInput()
}

function refreshImageResizeConstraints(img) {
  if (!img) return
  const maxW = getEditorImageMaxWidth(img)
  applyImageWidth(img, getImageDisplayWidth(img))
  if (imageResizeBar.value.visible && selectedImageEl === img) {
    imageResizeBar.value.max = maxW
    imageResizeBar.value.value = getImageDisplayWidth(img)
    updateImageResizeBar()
  }
}

function bindImageLoadConstraints(img) {
  if (!img) return
  if (img.complete && img.naturalWidth) {
    refreshImageResizeConstraints(img)
    return
  }
  img.addEventListener('load', () => refreshImageResizeConstraints(img), { once: true })
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
  applyImageWidth(img, getImageDisplayWidth(img))
  bindImageLoadConstraints(img)
  nextTick(updateImageResizeBar)
}

function handleEditorMouseDown(e) {
  if (Date.now() - lastTouchTime < 500) return
  if (e.button !== 0) return
  if (e.target.closest('.img-resize-bar')) return
  const img = e.target.closest('img.content-img')
  const wrap = e.target.closest('.content-img-wrap')
  if (img || wrap) {
    e.preventDefault()
    const targetImg = img || wrap?.querySelector('img.content-img')
    if (targetImg) selectEditorImage(targetImg)
  } else if (!e.target.closest('.img-ctx-menu') && !e.target.closest('.img-resize-bar')) {
    clearImageSelection()
  }
}

function handleEditorTouchStart(e) {
  if (!isEditing.value) return
  if (e.target.closest('.img-resize-bar')) return
  const img = e.target.closest('img.content-img')
  const wrap = e.target.closest('.content-img-wrap')
  const targetImg = img || wrap?.querySelector('img.content-img')
  if (!targetImg) return
  lastTouchTime = Date.now()
  selectEditorImage(targetImg)
}

function handlePreviewClick(e) {
  const img = e.target.closest('img.content-img')
  if (!img) return
  imagePreview.value = {
    visible: true,
    src: resolveFileUrl(img.getAttribute('src') || ''),
    alt: img.getAttribute('alt') || '',
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
      toastError(err.message || '附件删除失败')
    }
  }
}

function onDocumentClick(e) {
  closeImgContextMenu()
  if (e.target.closest('.img-resize-bar')) return
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
    clearImageSelection()
  }
}

const renderedPreview = computed(() =>
  ensureImageWrappers(rewriteContentImages(contentToHtml(editContent.value)), { forPreview: true })
)

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

function ensureImageWrappers(html, { forPreview = false } = {}) {
  const temp = document.createElement('div')
  temp.innerHTML = html
  temp.querySelectorAll('img').forEach((img) => {
    img.classList.add('content-img')
    img.removeAttribute('width')
    img.removeAttribute('height')
    img.style.height = ''
    let wrap = img.closest('.content-img-wrap')
    if (!wrap) {
      wrap = document.createElement('div')
      wrap.className = 'content-img-wrap align-left'
      img.parentNode.insertBefore(wrap, img)
      wrap.appendChild(img)
    }
    if (forPreview) {
      wrap.removeAttribute('contenteditable')
    } else {
      wrap.setAttribute('contenteditable', 'false')
    }
  })
  return temp.innerHTML
}

function normalizeEditorImages() {
  const editor = contentEditorRef.value
  if (!editor) return
  let changed = false
  editor.querySelectorAll('img').forEach((img) => {
    if (!img.classList.contains('content-img')) {
      img.classList.add('content-img')
      changed = true
    }
    if (img.hasAttribute('width') || img.hasAttribute('height') || img.style.height) {
      img.removeAttribute('width')
      img.removeAttribute('height')
      img.style.height = ''
      changed = true
    }
    let wrap = img.closest('.content-img-wrap')
    if (!wrap) {
      wrap = document.createElement('div')
      wrap.className = 'content-img-wrap align-left'
      wrap.setAttribute('contenteditable', 'false')
      img.parentNode.insertBefore(wrap, img)
      wrap.appendChild(img)
      changed = true
    }
  })
  if (changed) handleEditorInput()
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

function wrapSelectionWithElement(createElement) {
  const sel = window.getSelection()
  if (!sel.rangeCount || sel.isCollapsed) return false
  const range = sel.getRangeAt(0)
  const el = createElement()
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

function wrapSelectionWithTag(tagName) {
  return wrapSelectionWithElement(() => document.createElement(tagName))
}

function execEditorCommand(command, value = null) {
  const editor = contentEditorRef.value
  if (!editor || !isEditing.value) return

  if (command === 'bold' || command === 'italic') {
    applyInlineFormat(command)
    return
  }

  editor.focus()
  restoreSavedSelection()

  document.execCommand('styleWithCSS', false, false)
  const ok = document.execCommand(command, false, value)

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

function restoreSavedSelection() {
  const sel = window.getSelection()
  if (savedSelection) {
    try {
      sel.removeAllRanges()
      sel.addRange(savedSelection)
    } catch {
      savedSelection = null
    }
  }
}

function getEditorSelectionRange() {
  const editor = contentEditorRef.value
  const sel = window.getSelection()
  if (!editor || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return null
  return range
}

function selectionTouchesNonEditable(range) {
  const container = document.createElement('div')
  container.appendChild(range.cloneContents())
  return container.querySelector('img.content-img, .content-img-wrap') !== null
}

function unwrapElement(el) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

function insertCollapsedFormatSpan(className, range, sel) {
  const el = document.createElement('span')
  el.className = className
  const marker = document.createTextNode('\u200B')
  el.appendChild(marker)
  range.insertNode(el)
  range.setStart(marker, 1)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

const INLINE_FORMAT = {
  italic: { className: 'fmt-italic', legacyTags: ['em', 'i'] },
  bold: { className: 'fmt-bold', legacyTags: ['strong', 'b'] },
}

function findActiveFormatNode(anchor, editor, config) {
  if (!anchor || !editor) return null
  const byClass = anchor.closest?.(`.${config.className}`)
  if (byClass && editor.contains(byClass)) return byClass
  for (const tag of config.legacyTags) {
    const el = anchor.closest?.(tag)
    if (el && editor.contains(el)) return el
  }
  return null
}

function applyInlineFormat(kind) {
  const config = INLINE_FORMAT[kind]
  const editor = contentEditorRef.value
  if (!config || !editor || !isEditing.value) return

  clearImageSelection()
  editor.focus()
  restoreSavedSelection()

  const sel = window.getSelection()
  const range = getEditorSelectionRange()
  if (!range || selectionTouchesNonEditable(range)) {
    savedSelection = null
    return
  }

  let anchor = sel.anchorNode
  if (anchor?.nodeType === Node.TEXT_NODE) anchor = anchor.parentElement
  const activeNode = findActiveFormatNode(anchor, editor, config)

  if (range.collapsed) {
    if (activeNode) {
      unwrapElement(activeNode)
    } else {
      insertCollapsedFormatSpan(config.className, range, sel)
    }
  } else if (activeNode && activeNode.textContent === range.toString()) {
    unwrapElement(activeNode)
  } else {
    wrapSelectionWithElement(() => {
      const span = document.createElement('span')
      span.className = config.className
      return span
    })
  }

  savedSelection = null
  handleEditorInput()
}

function handleInlineFormat(kind) {
  saveEditorSelection()
  applyInlineFormat(kind)
}

function onEditorSelectionChange() {
  if (isApplyingHistory || isLoadingItem) return
  const editor = contentEditorRef.value
  if (!editor || !isEditing.value) return
  const sel = window.getSelection()
  if (!sel.rangeCount) return
  const anchor = sel.anchorNode
  if (!anchor || !editor.contains(anchor)) return
  const parent = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor
  if (parent?.closest('.content-img-wrap, img.content-img')) return
  try {
    savedSelection = sel.getRangeAt(0).cloneRange()
  } catch {
    /* ignore invalid range */
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
  clearImageSelection()
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
    isEditingTitle.value = false
    await loadAttachments()
    await nextTick()
    syncEditorFromContent()
    if (notebookStore.pendingRenameItemId === item.id) {
      notebookStore.pendingRenameItemId = null
      startTitleEdit()
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

function startTitleEdit() {
  titleBeforeEdit.value = editTitle.value
  isEditingTitle.value = true
  nextTick(() => {
    titleInputRef.value?.focus()
    titleInputRef.value?.select()
  })
}

function finishTitleEdit() {
  if (!isEditingTitle.value) return
  isEditingTitle.value = false
  pushHistory()
}

function cancelTitleEdit() {
  if (!isEditingTitle.value) return
  editTitle.value = titleBeforeEdit.value
  isEditingTitle.value = false
  syncUnsavedState()
}

function handleEditToggle() {
  if (isEditingTitle.value) finishTitleEdit()
  isEditing.value = !isEditing.value
  if (isEditing.value) {
    nextTick(syncEditorFromContent)
  }
}

async function handleSave() {
  if (!currentItem.value) return
  if (isEditingTitle.value) finishTitleEdit()
  message.value = ''
  pushHistory()
  const ok = await saveNote({ manual: true, force: true })
  if (ok) await loadAttachments()
}

async function handleSaveDraft() {
  if (!currentItem.value) return
  if (isEditingTitle.value) finishTitleEdit()
  message.value = ''
  pushHistory()
  const ok = await saveNote({ manual: true, force: true, draft: true })
  if (ok) await loadAttachments()
}

async function handleBack() {
  const canLeave = await notebookStore.tryLeaveEditor()
  if (!canLeave) return
  notebookStore.closeNoteEditor()
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
    const copied = await copyTextToClipboard(url)
    if (copied) {
      toastSuccess('分享链接已复制到剪贴板')
    } else {
      window.prompt('请手动复制分享链接', url)
    }
  } catch (err) {
    toastError(err.message)
  }
}

function handleInsertImage() {
  if (isUploading.value) return
  saveEditorSelection()
  imageInput.value?.click()
}

async function prepareImageFile(file) {
  return resizeImageFile(file, {
    maxWidth: EDITOR_IMAGE_PASTE_MAX_WIDTH,
    maxHeight: EDITOR_IMAGE_PASTE_MAX_WIDTH,
    quality: EDITOR_IMAGE_PASTE_QUALITY,
  })
}

async function handleEditorPaste(e) {
  const clipboard = e.clipboardData
  if (!clipboard || isUploading.value) return

  const imageFiles = []
  for (const item of clipboard.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) imageFiles.push(file)
    }
  }

  if (imageFiles.length) {
    e.preventDefault()
    saveEditorSelection()
    for (const file of imageFiles) {
      const result = await uploadFileWithProgress(file)
      if (result) {
        insertImageInEditor(resolveFileUrl(result.url), file.name || '粘贴图片')
      }
    }
    return
  }

  nextTick(() => normalizeEditorImages())
}

async function uploadFileWithProgress(file) {
  if (!isAllowedAttachmentFile(file)) {
    toastWarning(getAttachmentTypeError(file.name))
    return null
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    toastWarning(`「${file.name}」超出大小限制（最大 ${MAX_ATTACHMENT_SIZE_LABEL}）`)
    return null
  }

  let uploadTarget = file
  if (file.type?.startsWith('image/')) {
    try {
      uploadTarget = await prepareImageFile(file)
    } catch (err) {
      toastError(err.message || '图片处理失败')
      return null
    }
  }

  try {
    await ensureNoteSaved()
  } catch (err) {
    toastError(err.message || '请先保存笔记后再上传')
    return null
  }

  isUploading.value = true
  const progressId = toastProgress(`正在上传「${file.name}」`, 0)

  try {
    const result = await uploadAttachment(currentItem.value.id, uploadTarget, {
      onProgress: (percent) => {
        updateToast(progressId, {
          message: `正在上传「${file.name}」`,
          progress: percent < 0 ? -1 : percent,
        })
      },
    })
    updateToast(progressId, { progress: 100 })
    dismiss(progressId)
    toastSuccess(`「${file.name}」上传成功`)
    await loadAttachments()
    markDirty()
    return result
  } catch (err) {
    dismiss(progressId)
    toastError(resolveUploadError(err, file.name))
    return null
  } finally {
    isUploading.value = false
  }
}

async function handleImageChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const result = await uploadFileWithProgress(file)
  if (result) {
    const url = resolveFileUrl(result.url)
    insertImageInEditor(url, file.name)
  }
  e.target.value = ''
}

function handleAttachment() {
  if (isUploading.value) return
  fileInput.value?.click()
}

async function handleFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  await uploadFileWithProgress(file)
  e.target.value = ''
}

async function handleRemoveAttachment(id) {
  if (!confirm('确定删除该附件吗？')) return
  try {
    await deleteAttachment(id)
    await loadAttachments()
    markDirty()
    toastSuccess('附件已删除')
  } catch (err) {
    toastError(err.message || '删除失败')
  }
}

function handleDownloadAttachment(file) {
  if (!confirm(`是否下载「${file.fileName}」？`)) return
  const url = resolveFileUrl(file.url)
  if (!url) {
    toastError('下载链接无效')
    return
  }
  const link = document.createElement('a')
  link.href = url
  link.download = file.fileName || 'download'
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function getAttachmentIconName(file) {
  return isImageFile(file) ? 'insert-image' : 'attachment'
}

function handleClear() {
  if (!currentItem.value || currentItem.value.itemType !== 'note') return

  const hasContent = !!editContent.value.replace(/<[^>]+>/g, '').replace(/\s/g, '').length
    || editContent.value.includes('<img')
  const hasAttachments = attachments.value.length > 0

  if (!hasContent && !hasAttachments) {
    toastInfo('笔记内容已是空的')
    return
  }

  clearDialogVisible.value = true
}

async function handleClearConfirm() {
  clearDialogVisible.value = false

  try {
    for (const file of [...attachments.value]) {
      await deleteAttachment(file.id)
    }
    attachments.value = []

    editContent.value = ''
    isEditing.value = true
    await nextTick()
    syncEditorFromContent()
    pushHistory()
    markDirty()
    toastSuccess('已清空')
  } catch (err) {
    toastError(err.message || '清空失败')
    await loadAttachments()
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
  try {
    await notebookStore.renameItem(currentItem.value.id, folderName.value.trim())
    toastSuccess('保存成功')
  } catch (err) {
    toastError(err.message || '保存失败')
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

watch(isEditing, (val) => {
  if (!val) {
    clearImageSelection()
  }
})

onMounted(() => {
  document.addEventListener('selectionchange', onEditorSelectionChange)
  window.addEventListener('resize', updateImageResizeBar)
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)
  notebookStore.registerEditorActions({ requestLeave: requestLeaveConfirm })
})

onBeforeUnmount(() => {
  clearAutoSaveTimer()
  document.removeEventListener('selectionchange', onEditorSelectionChange)
  window.removeEventListener('resize', updateImageResizeBar)
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
          <button type="button" class="tool-btn" title="返回" @click="handleBack">
            <AppIcon name="back" :size="18" alt="返回" />
          </button>
          <button class="tool-btn" :disabled="saving" title="保存" @click="handleSave">
            <AppIcon name="save" :size="18" alt="保存" />
          </button>
          <button class="tool-btn" :disabled="saving" title="保存为草稿" @click="handleSaveDraft">
            <AppIcon name="caogao" :size="18" alt="存为草稿" />
          </button>
          <button class="tool-btn" :title="isEditing ? '预览' : '编辑'" @click="handleEditToggle">
            <AppIcon :name="isEditing ? 'preview' : 'edit'" :size="18" :alt="isEditing ? '预览' : '编辑'" />
          </button>
          <button class="tool-btn" title="撤销" @mousedown.prevent @click="handleUndo">
            <AppIcon name="undo" :size="18" alt="撤销" />
          </button>
          <button class="tool-btn" title="恢复" @mousedown.prevent @click="handleRedo">
            <AppIcon name="redo" :size="18" alt="恢复" />
          </button>
          <button class="tool-btn" :class="{ favorited: isFavorite }" title="收藏" @click="handleToggleFavorite">
            <AppIcon :name="isFavorite ? 'favorite-filled' : 'favorite-outline'" :size="18" alt="收藏" />
          </button>
          <button class="tool-btn" :class="{ disabled: !canShare }" title="分享" @click="handleShare">
            <AppIcon name="share" :size="18" alt="分享" />
          </button>
          <button
            class="tool-btn"
            :class="{ disabled: isUploading }"
            :disabled="isUploading"
            title="插入图片"
            @click="handleInsertImage"
          >
            <AppIcon name="insert-image" :size="18" alt="插入图片" />
          </button>
          <button
            class="tool-btn"
            :class="{ disabled: isUploading }"
            :disabled="isUploading"
            title="附件"
            @click="handleAttachment"
          >
            <AppIcon name="attachment" :size="18" alt="附件" />
          </button>
          <button class="tool-btn" title="清空" @click="handleClear">
            <AppIcon name="clear" :size="18" alt="清空" />
          </button>
          <button class="tool-btn danger" title="删除" @click="handleDelete">
            <AppIcon name="delete" :size="18" alt="删除" />
          </button>

          <template v-if="isEditing">
            <span class="toolbar-divider" />
            <button type="button" class="tool-btn" title="加粗" @mousedown.prevent="handleInlineFormat('bold')">
              <AppIcon name="bold" :size="18" alt="加粗" />
            </button>
            <button type="button" class="tool-btn" title="倾斜" @mousedown.prevent="handleInlineFormat('italic')">
              <AppIcon name="italic" :size="18" alt="倾斜" />
            </button>
            <span class="toolbar-divider" />
            <button type="button" class="tool-btn" title="左对齐" @mousedown.prevent="handleFormatMouseDown" @click="applyTextOrImageAlignment('justifyLeft')">
              <AppIcon name="align-left" :size="18" alt="左对齐" />
            </button>
            <button type="button" class="tool-btn" title="居中对齐" @mousedown.prevent="handleFormatMouseDown" @click="applyTextOrImageAlignment('justifyCenter')">
              <AppIcon name="align-center" :size="18" alt="居中对齐" />
            </button>
            <button type="button" class="tool-btn" title="右对齐" @mousedown.prevent="handleFormatMouseDown" @click="applyTextOrImageAlignment('justifyRight')">
              <AppIcon name="align-right" :size="18" alt="右对齐" />
            </button>
            <span class="toolbar-divider" />
            <label class="tool-btn fmt-color" title="字体颜色" @mousedown.prevent="handleFormatMouseDown">
              <AppIcon name="text-color" :size="18" alt="字体颜色" />
              <input type="color" v-model="fontColor" class="fmt-color-input" @input="handleColorChange" />
            </label>
            <label class="tool-btn fmt-size" title="字体大小" @mousedown="handleFormatMouseDown">
              <span class="fmt-size-icon">font</span>
              <select class="fmt-size-select" @change="handleFontSizeChange">
                <option value="">默认</option>
                <option v-for="size in fontSizes" :key="size" :value="size">{{ size }}px</option>
              </select>
            </label>
          </template>

          <span v-if="message" class="save-msg">{{ message }}</span>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="content-area" @scroll="updateImageResizeBar">
        <div class="title-row">
          <div class="title-main">
            <input
              v-if="isEditingTitle"
              ref="titleInputRef"
              v-model="editTitle"
              class="title-input"
              placeholder="笔记标题"
              @blur="finishTitleEdit"
              @keydown.enter.prevent="finishTitleEdit"
              @keydown.esc.prevent="cancelTitleEdit"
            />
            <h1 v-else class="title-display">{{ editTitle || '无标题' }}</h1>
            <button
              v-if="isEditing && !isEditingTitle"
              type="button"
              class="title-edit-btn"
              title="修改标题"
              @click="startTitleEdit"
            >
              <AppIcon name="edit" :size="16" alt="修改标题" />
            </button>
          </div>
          <span class="save-status" :class="saveStatus">{{ saveStatusText }}</span>
        </div>

        <div class="editor-body" @scroll="updateImageResizeBar">
          <div
            v-if="isEditing"
            ref="contentEditorRef"
            class="content-editor"
            contenteditable="true"
            :style="{ '--editor-image-max-width': `${EDITOR_IMAGE_MAX_WIDTH}px` }"
            @input="handleEditorInput"
            @blur="handleEditorBlur"
            @mouseup="handleEditorMouseUp"
            @keyup="handleEditorKeyUp"
            @mousedown="handleEditorMouseDown"
            @touchstart.passive="handleEditorTouchStart"
            @paste="handleEditorPaste"
            @contextmenu="handleContentContextMenu"
          />
          <div
            v-else
            class="content-preview"
            :style="{ '--editor-image-max-width': `${EDITOR_IMAGE_MAX_WIDTH}px` }"
            v-html="renderedPreview"
            @click="handlePreviewClick"
            @contextmenu="handleContentContextMenu"
          />
        </div>

        <section v-if="attachments.length || attachmentsLoading" class="attachments-section">
          <h4 class="attachments-title">
            <AppIcon name="attachment" :size="16" alt="" /> 附件列表
            <span v-if="!attachmentsLoading">({{ attachments.length }})</span>
          </h4>
          <p v-if="attachmentsLoading" class="attachments-loading">加载中...</p>
          <ul v-else class="attachments-list">
            <li v-for="file in attachments" :key="file.id" class="attachment-tag">
              <button
                type="button"
                class="attachment-tag-main"
                :title="file.fileName"
                @click="handleDownloadAttachment(file)"
              >
                <AppIcon :name="getAttachmentIconName(file)" :size="14" alt="" />
                <span class="attachment-tag-name">{{ file.fileName }}</span>
              </button>
              <button
                type="button"
                class="attachment-tag-del"
                title="删除附件"
                @click.stop="handleRemoveAttachment(file.id)"
              >
                <AppIcon name="close" :size="12" alt="删除" />
              </button>
            </li>
          </ul>
        </section>
        <section v-else class="attachments-section attachments-empty-section">
          <EmptyState
            size="inline"
            title="暂无附件"
            hint="可通过工具栏插入图片或上传附件"
          />
        </section>
      </div>

      <!-- 状态栏 -->
      <div class="status-bar">
        <span><AppIcon name="note" :size="14" alt="" /> 最后保存: {{ formatSavedTime(currentItem.lastSavedAt) }}</span>
        <span><AppIcon name="stats" :size="14" alt="" /> 字数: {{ wordCount }}</span>
      </div>
    </template>

    <div v-else-if="currentItem && currentItem.itemType === 'folder'" class="folder-panel">
      <div class="folder-toolbar">
        <button type="button" class="folder-action-btn primary" :disabled="saving" title="保存名称" @click="handleFolderRename">
          <AppIcon name="save" :size="18" alt="保存" />
        </button>
        <button type="button" class="folder-action-btn danger" title="删除" @click="handleDelete">
          <AppIcon name="delete" :size="18" alt="删除" />
        </button>
        <span v-if="message" class="save-msg">{{ message }}</span>
      </div>
      <div class="folder-content">
        <AppIcon name="folder" :size="48" class="folder-icon" alt="" />
        <input
          ref="folderNameInputRef"
          v-model="folderName"
          class="folder-name-input"
          placeholder="文件夹名称"
          @keyup.enter="handleFolderRename"
        />
        <p class="hint">在此修改文件夹名称，点击右上角 + 或右键在此文件夹下新建内容</p>
      </div>
    </div>

    <EmptyState
      v-else
      fill
      size="lg"
      title="未选中任何内容"
      description="从左侧选择一篇笔记或文件夹"
    />

    <input ref="imageInput" type="file" accept="image/*" hidden @change="handleImageChange" />
    <input ref="fileInput" type="file" :accept="ATTACHMENT_ACCEPT" hidden @change="handleFileChange" />

    <Teleport to="body">
      <div
        v-if="imgContextMenu.visible"
        class="img-ctx-menu"
        :style="{ left: `${imgContextMenu.x}px`, top: `${imgContextMenu.y}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <button type="button" @click="handleViewEditorImage">
          <AppIcon name="view-image" :size="16" alt="" /> 查看图片
        </button>
        <button type="button" class="danger" @click="handleDeleteEditorImage">
          <AppIcon name="delete" :size="16" alt="" /> 删除图片
        </button>
      </div>

      <div v-if="imagePreview.visible" class="image-preview-overlay" @click="closeImagePreview">
        <div class="image-preview-box" @click.stop>
          <button type="button" class="image-preview-close" @click="closeImagePreview">
            <AppIcon name="close" :size="18" alt="关闭" />
          </button>
          <img :src="imagePreview.src" :alt="imagePreview.alt" class="image-preview-img" />
          <p v-if="imagePreview.alt" class="image-preview-caption">{{ imagePreview.alt }}</p>
        </div>
      </div>

      <div
        v-if="imageResizeBar.visible"
        class="img-resize-bar"
        :style="{
          left: `${imageResizeBar.left}px`,
          top: `${imageResizeBar.top}px`,
          width: `${imageResizeBar.width}px`,
        }"
        @mousedown.stop
        @touchstart.stop
        @click.stop
      >
        <input
          v-model.number="imageResizeBar.value"
          type="range"
          class="img-resize-bar-slider"
          :min="imageResizeBar.min"
          :max="imageResizeBar.max"
          @input="handleImageResizeBarInput"
          @change="handleImageResizeBarChange"
        />
      </div>
    </Teleport>

    <UnsavedChangesDialog
      :visible="leaveDialogVisible"
      @save="handleLeaveSave"
      @discard="handleLeaveDiscard"
      @cancel="handleLeaveCancel"
    />

    <WechatConfirmDialog
      :visible="clearDialogVisible"
      title="清空笔记"
      :message="'确定清空笔记正文和所有图片吗？\n此操作不可撤销，清空后需手动保存。'"
      confirm-text="清空"
      :danger="true"
      @close="clearDialogVisible = false"
      @confirm="handleClearConfirm"
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
  gap: 3px;
  flex-wrap: wrap;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 2px;
  flex-shrink: 0;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: #374151;
  flex-shrink: 0;
  transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
}

.tool-btn:hover:not(:disabled):not(.disabled) {
  background: #eff6ff;
}

.tool-btn:active:not(:disabled):not(.disabled) {
  transform: scale(0.94);
}

.tool-btn.primary {
  background: #2563eb;
}

.tool-btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28);
}

.tool-btn.primary:active:not(:disabled) {
  transform: scale(0.94);
}

.tool-btn:disabled,
.tool-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.tool-btn.favorited :deep(.app-icon) {
  opacity: 0.72;
}

.tool-btn.danger:hover:not(:disabled) {
  background: #fef2f2;
}

.save-msg {
  font-size: 13px;
  color: #22c55e;
  margin-left: 4px;
}

.fmt-color {
  position: relative;
}

.fmt-color-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.fmt-size {
  position: relative;
}

.fmt-size-icon {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #374151;
  pointer-events: none;
  user-select: none;
  letter-spacing: -0.02em;
}

.fmt-size-select {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.content-area {
  flex: 1;
  min-height: 0;
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

.title-main {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-edit-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.15s, background 0.15s;
}

.title-edit-btn:hover {
  opacity: 1;
  background: #eff6ff;
}

.title-input {
  flex: 1;
  min-width: 0;
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
  min-width: 0;
  font-size: 28px;
  font-weight: 600;
  color: #1e293b;
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
  width: fit-content;
  max-width: 100%;
  margin: 12px 0;
}

.content-editor :deep(.content-img-wrap) {
  cursor: pointer;
}

.content-editor :deep(.content-img-wrap-selected) {
  position: relative;
}

.content-editor :deep(.content-img-wrap-selected .content-img),
.content-editor :deep(.content-img-selected) {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
  border-color: #2563eb;
}

.content-editor :deep(.content-img),
.content-preview :deep(.content-img),
.content-editor :deep(img),
.content-preview :deep(img) {
  display: block;
  max-width: min(100%, var(--editor-image-max-width, 720px));
  height: auto;
  margin: 0;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.content-editor :deep(.content-img) {
  cursor: pointer;
  pointer-events: auto;
}

@media (min-width: 769px) {
  .content-preview {
    cursor: text;
  }

  .content-preview :deep(a) {
    cursor: pointer;
  }

  .content-preview :deep(.content-img-wrap) {
    cursor: default;
  }

  .content-preview :deep(.content-img) {
    cursor: pointer;
  }
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

.content-editor :deep(.fmt-italic),
.content-preview :deep(.fmt-italic),
.content-editor :deep(em),
.content-editor :deep(i),
.content-preview :deep(em),
.content-preview :deep(i) {
  font-style: italic;
  transform: skewX(-10deg);
  display: inline-block;
}

.content-editor :deep(span[style*='font-style: italic']),
.content-editor :deep(span[style*='font-style: oblique']),
.content-preview :deep(span[style*='font-style: italic']),
.content-preview :deep(span[style*='font-style: oblique']) {
  font-style: italic;
  transform: skewX(-10deg);
  display: inline-block;
}

.content-editor :deep(.fmt-bold),
.content-preview :deep(.fmt-bold),
.content-editor :deep(strong),
.content-editor :deep(b),
.content-preview :deep(strong),
.content-preview :deep(b) {
  font-weight: 700;
}

.attachments-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.attachments-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}

.attachments-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.attachment-tag {
  display: inline-flex;
  align-items: center;
  max-width: min(100%, 240px);
  height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  overflow: hidden;
}

.attachment-tag-main {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  max-width: 100%;
  height: 100%;
  padding: 0 2px 0 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  color: #334155;
}

.attachment-tag-main:hover {
  color: #2563eb;
}

.attachment-tag-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-tag-del {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 100%;
  padding: 0;
  border: none;
  border-left: 1px solid #e2e8f0;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
}

.attachment-tag-del:hover {
  color: #ef4444;
  background: #fef2f2;
}

.attachments-empty-section {
  padding-top: 0;
}

.attachments-loading {
  margin: 0;
  font-size: 12px;
  color: #94a3b8;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.status-bar span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
  gap: 8px;
  flex-shrink: 0;
}

.folder-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.12s;
}

.folder-action-btn:hover:not(:disabled) {
  background: #eff6ff;
}

.folder-action-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.folder-action-btn.primary {
  background: #2563eb;
}

.folder-action-btn.primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.folder-action-btn.danger:hover:not(:disabled) {
  background: #fef2f2;
}

.folder-content {
  flex: 1;
  padding: 40px 32px;
  min-width: 0;
}

.folder-icon {
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

.img-resize-bar {
  position: fixed;
  z-index: 4100;
  height: 18px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #dbeafe;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.1);
  pointer-events: auto;
}

.img-resize-bar-slider {
  width: 100%;
  height: 3px;
  margin: 0;
  accent-color: #2563eb;
  cursor: pointer;
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
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
    padding: 6px 8px;
  }

  .tool-btn {
    width: 34px;
    height: 34px;
  }

  .content-area {
    padding: 0;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .title-row {
    flex-shrink: 0;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 0;
    padding: 8px 8px 4px;
  }

  .title-main {
    min-width: 0;
  }

  .title-edit-btn {
    width: 26px;
    height: 26px;
  }

  .title-input,
  .title-display {
    flex: 1;
    min-width: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .title-row .save-status {
    flex-shrink: 0;
    font-size: 11px;
  }

  .editor-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: none;
    border-radius: 0;
  }

  .content-editor,
  .content-preview {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 10px 8px;
    font-size: 15px;
    -webkit-overflow-scrolling: touch;
  }

  .content-editor :deep(.content-img),
  .content-preview :deep(.content-img),
  .content-editor :deep(img),
  .content-preview :deep(img) {
    border: none;
    border-radius: 0;
    max-width: min(100%, var(--editor-image-max-width, 720px));
  }

  .content-editor :deep(.content-img-wrap),
  .content-preview :deep(.content-img-wrap) {
    margin: 8px 0;
  }

  .attachments-section {
    flex-shrink: 0;
    margin-top: 0;
    padding: 6px 8px 8px;
    border-top: 1px solid #f1f5f9;
  }

  .attachments-title {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
  }

  .attachments-list {
    flex-wrap: wrap;
    overflow: visible;
    gap: 6px;
    padding-bottom: 0;
  }

  .attachment-tag {
    max-width: min(100%, 200px);
    height: 26px;
  }

  .attachment-tag-main {
    font-size: 11px;
    padding-left: 8px;
  }

  .attachments-empty-section {
    flex-shrink: 0;
    margin-top: 0;
    padding: 4px 8px 6px;
    border-top: 1px solid #f1f5f9;
  }

  .status-bar {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: nowrap;
    gap: 12px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .folder-toolbar {
    padding: 6px 8px;
  }

  .folder-content {
    padding: 24px 16px;
  }

  .folder-name-input {
    font-size: 18px;
  }
}
</style>

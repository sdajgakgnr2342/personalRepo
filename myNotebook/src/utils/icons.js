import logo from '@/assets/branding/logo.png'
import favicon from '@/assets/branding/favicon.png'

import stats from '@/assets/nav/stats.png'
import home from '@/assets/nav/home.png'
import myNotes from '@/assets/nav/my-notes.png'
import drafts from '@/assets/nav/drafts.png'
import favorites from '@/assets/nav/favorites.png'
import trash from '@/assets/nav/trash.png'

import folder from '@/assets/content/folder.png'
import note from '@/assets/content/note.png'
import folderLocked from '@/assets/content/folder-locked.png'
import folderUnlocked from '@/assets/content/folder-unlocked.png'
import clipboard from '@/assets/content/clipboard.png'

import save from '@/assets/toolbar/save.png'
import edit from '@/assets/toolbar/edit.png'
import preview from '@/assets/toolbar/preview.png'
import undo from '@/assets/toolbar/undo.png'
import redo from '@/assets/toolbar/redo.png'
import favoriteFilled from '@/assets/toolbar/favorite-filled.png'
import favoriteOutline from '@/assets/toolbar/favorite-outline.png'
import share from '@/assets/toolbar/share.png'
import insertImage from '@/assets/toolbar/insert-image.png'
import viewImage from '@/assets/toolbar/view-image.png'
import attachment from '@/assets/toolbar/attachment.png'
import deleteIcon from '@/assets/toolbar/delete.png'
import restore from '@/assets/toolbar/restore.png'
import deletePermanent from '@/assets/toolbar/delete-permanent.png'
import clear from '@/assets/toolbar/clear.png'
import caogao from '@/assets/toolbar/caogao.png'

import alignLeft from '@/assets/format/align-left.png'
import alignCenter from '@/assets/format/align-center.png'
import alignRight from '@/assets/format/align-right.png'
import bold from '@/assets/format/bold.png'
import italic from '@/assets/format/italic.png'
import textColor from '@/assets/format/text-color.png'

import menu from '@/assets/topbar/menu.png'
import search from '@/assets/topbar/search.png'
import refresh from '@/assets/topbar/refresh.png'
import help from '@/assets/topbar/help.png'
import about from '@/assets/topbar/about.png'
import user from '@/assets/topbar/user.png'

import success from '@/assets/toast/success.png'
import error from '@/assets/toast/error.png'
import warning from '@/assets/toast/warning.png'
import info from '@/assets/toast/info.png'

import close from '@/assets/ui/close.png'
import add from '@/assets/ui/add.png'
import expand from '@/assets/ui/expand.png'
import collapse from '@/assets/ui/collapse.png'
import sidebarExpand from '@/assets/ui/sidebar-expand.png'
import sidebarCollapse from '@/assets/ui/sidebar-collapse.png'
import back from '@/assets/ui/back.png'
import lock from '@/assets/ui/lock.png'

export const icons = {
  logo,
  favicon,
  stats,
  home,
  'my-notes': myNotes,
  drafts,
  favorites,
  trash,
  folder,
  note,
  'folder-locked': folderLocked,
  'folder-unlocked': folderUnlocked,
  clipboard,
  save,
  edit,
  preview,
  undo,
  redo,
  'favorite-filled': favoriteFilled,
  'favorite-outline': favoriteOutline,
  share,
  'insert-image': insertImage,
  'view-image': viewImage,
  attachment,
  delete: deleteIcon,
  restore,
  'delete-permanent': deletePermanent,
  clear,
  caogao,
  'align-left': alignLeft,
  'align-center': alignCenter,
  'align-right': alignRight,
  bold,
  italic,
  'text-color': textColor,
  menu,
  search,
  refresh,
  help,
  about,
  user,
  success,
  error,
  warning,
  info,
  close,
  add,
  expand,
  collapse,
  'sidebar-expand': sidebarExpand,
  'sidebar-collapse': sidebarCollapse,
  back,
  lock,
}

export function getTreeItemIcon(node, isLocked) {
  if (node.itemType === 'note') return 'note'
  if (isLocked) return 'folder-locked'
  if (node.isEncrypted) return 'folder-unlocked'
  return 'folder'
}

export function getContentTypeIcon(itemType) {
  return itemType === 'folder' ? 'folder' : 'note'
}

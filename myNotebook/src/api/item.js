import { get, post, put, del } from '@/utils/request'
import request from '@/utils/request'

export function getItem(id) {
  return get(`/items/${id}`)
}

export function createFolder(data) {
  return post('/items/folders', data)
}

export function createNote(data) {
  return post('/items/notes', data)
}

export function updateItem(id, data) {
  return put(`/items/${id}`, data)
}

export function saveNote(id, data) {
  return post(`/items/${id}/save`, data)
}

export function toggleFavorite(id) {
  return post(`/items/${id}/favorite`)
}

export function unlockFolder(id, password) {
  return post(`/items/${id}/unlock`, { password })
}

export function shareNote(id) {
  return post(`/items/${id}/share`)
}

export function moveToTrash(id, data) {
  return request.delete(`/items/${id}`, { data: data || {} })
}

export function restoreItem(id) {
  return post(`/items/${id}/restore`)
}

export function permanentDelete(id, data) {
  return request.delete(`/items/${id}/permanent`, { data: data || {} })
}

export function searchNotes(q) {
  return get('/items/search', { q })
}

export function getAttachments(itemId) {
  return get(`/items/${itemId}/attachments`)
}

export function uploadAttachment(itemId, file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post(`/items/${itemId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteAttachment(id) {
  return del(`/items/attachments/${id}`)
}

export function getEncryptedFolders(id) {
  return get(`/items/${id}/encrypted-folders`)
}

export function getSharedNote(token) {
  return get(`/items/share/${token}`)
}

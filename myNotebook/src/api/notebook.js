import { get } from '@/utils/request'

export function getStats() {
  return get('/notebook')
}

export function getTree() {
  return get('/notebook/tree')
}

export function getDrafts() {
  return get('/notebook/drafts')
}

export function getFavorites() {
  return get('/notebook/favorites')
}

export function getTrash() {
  return get('/notebook/trash')
}

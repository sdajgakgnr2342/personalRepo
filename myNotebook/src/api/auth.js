import { get, post, put } from '@/utils/request'
import request from '@/utils/request'

export function login(data) {
  return post('/auth/login', data)
}

export function register(data) {
  return post('/auth/register', data)
}

export function getProfile() {
  return get('/auth/profile')
}

export function updateProfile(data) {
  return put('/auth/profile', data)
}

export function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)
  return request.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function changePassword(data) {
  return post('/auth/change-password', data)
}

export function logout() {
  return post('/auth/logout')
}

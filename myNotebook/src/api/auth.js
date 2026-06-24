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
    timeout: 60000,
  })
}

export function changePassword(data) {
  return post('/auth/change-password', data)
}

export function setSecretCode(data) {
  return post('/auth/secret-code', data)
}

export function verifySecretCode(data) {
  return post('/auth/verify-secret-code', data)
}

export function resetSecretCode(data) {
  return post('/auth/reset-secret-code', data)
}

export function resetSecretCodeByLogin(data) {
  return post('/auth/reset-secret-code-by-login', data)
}

export function logout() {
  return post('/auth/logout')
}

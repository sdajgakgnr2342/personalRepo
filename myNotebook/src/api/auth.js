import { get, post } from '@/utils/request'

export function login(data) {
  return post('/auth/login', data)
}

export function register(data) {
  return post('/auth/register', data)
}

export function getProfile() {
  return get('/auth/profile')
}

export function logout() {
  return post('/auth/logout')
}

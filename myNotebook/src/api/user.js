import { get, post } from '@/utils/request'

export function login(data) {
  return post('/auth/login', data)
}

export function getUserInfo() {
  return get('/user/info')
}

export function logout() {
  return post('/auth/logout')
}

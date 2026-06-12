import { getStorage, removeStorage, setStorage } from './storage'

const TOKEN_KEY = 'token'

export function getToken() {
  return getStorage(TOKEN_KEY)
}

export function setToken(token) {
  setStorage(TOKEN_KEY, token)
}

export function removeToken() {
  removeStorage(TOKEN_KEY)
}

export function isLoggedIn() {
  return !!getToken()
}

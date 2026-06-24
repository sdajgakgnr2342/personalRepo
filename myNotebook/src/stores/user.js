import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getToken, removeToken, setToken } from '@/utils/auth'
import { lockSecretRoom } from '@/utils/secretRoom'
import { useVaultStore } from '@/stores/vault'
import * as authApi from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken() || '')
  const userInfo = ref(null)

  async function login(credentials) {
    const data = await authApi.login(credentials)
    token.value = data.token
    userInfo.value = data.userInfo
    setToken(data.token)
    return data
  }

  async function register(form) {
    const data = await authApi.register(form)
    token.value = data.token
    userInfo.value = data.userInfo
    setToken(data.token)
    return data
  }

  async function fetchUserInfo() {
    if (!token.value) return null
    userInfo.value = await authApi.getProfile()
    return userInfo.value
  }

  async function updateProfile(payload) {
    userInfo.value = await authApi.updateProfile(payload)
    return userInfo.value
  }

  async function uploadAvatar(file) {
    userInfo.value = await authApi.uploadAvatar(file)
    return userInfo.value
  }

  async function changePassword(payload) {
    await authApi.changePassword(payload)
  }

  async function setSecretCode(payload) {
    userInfo.value = await authApi.setSecretCode(payload)
    return userInfo.value
  }

  async function resetSecretCode(payload) {
    userInfo.value = await authApi.resetSecretCode(payload)
    lockSecretRoom()
    return userInfo.value
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    token.value = ''
    userInfo.value = null
    removeToken()
    lockSecretRoom()
    useVaultStore().reset()
  }

  return { token, userInfo, login, register, fetchUserInfo, updateProfile, uploadAvatar, changePassword, setSecretCode, resetSecretCode, logout }
})

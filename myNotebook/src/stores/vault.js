import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as vaultApi from '@/api/vault'
import {
  createVaultKeys,
  deriveKeyCheckOnly,
  decryptVmkWithKek,
  rewrapVmkWithPassword,
  encryptFileForUpload,
  decryptFileFromChunks,
  unwrapFek,
  decryptMeta,
  b64ToBuf,
  bufToB64,
} from '@/crypto/vault'
import { getVaultSession, setVaultSession, clearVaultSession, getStoredVmkB64, setStoredVmkB64 } from '@/utils/vaultSession'

export const useVaultStore = defineStore('vault', () => {
  const profile = ref(null)
  const vmk = ref(getStoredVmkB64() ? b64ToBuf(getStoredVmkB64()) : null)
  const files = ref([])
  const filesTotal = ref(0)
  const loading = ref(false)

  const isUnlocked = computed(() => !!vmk.value && !!getVaultSession())
  const vaultStatus = computed(() => profile.value?.vaultStatus || 'uninitialized')
  const isInitialized = computed(() => vaultStatus.value !== 'uninitialized')
  const needsSetup = computed(() => vaultStatus.value === 'uninitialized')
  const needsUnlock = computed(() => ['active', 'locked'].includes(vaultStatus.value))
  const needsNewPassword = computed(() => vaultStatus.value === 'pending_new_password')

  async function fetchProfile() {
    profile.value = await vaultApi.getVaultProfile()
    return profile.value
  }

  async function setupVault(password, confirmPassword) {
    if (password.length < 8) throw new Error('保险柜密码至少 8 位')
    if (password !== confirmPassword) throw new Error('两次密码不一致')

    const keys = await createVaultKeys(password)
    const result = await vaultApi.initVault({
      vmk: keys.vmkB64,
      wrappedVmk: keys.wrappedVmkB64,
      vaultSalt: keys.saltB64,
      kdfParams: keys.kdfParams,
      keyCheck: keys.keyCheckB64,
    })

    setVaultSession(result.vaultSession)
    vmk.value = keys.vmk
    setStoredVmkB64(keys.vmkB64)
    await fetchProfile()
    return result
  }

  async function unlock(password) {
    if (!profile.value?.vaultSalt || !profile.value?.wrappedVmk) {
      await fetchProfile()
    }
    const { vaultSalt, wrappedVmk, kdfParams } = profile.value
    if (!vaultSalt || !wrappedVmk) throw new Error('保险库数据不完整')

    const { keyCheckB64, kek } = await deriveKeyCheckOnly(password, { vaultSalt, kdfParams })
    const result = await vaultApi.unlockCheck({ keyCheckCandidate: keyCheckB64 })

    const vmkBytes = await decryptVmkWithKek(kek, wrappedVmk)
    setVaultSession(result.vaultSession)
    vmk.value = vmkBytes
    setStoredVmkB64(bufToB64(vmkBytes))
    await fetchProfile()
    return result
  }

  function lock() {
    vmk.value = null
    clearVaultSession()
    vaultApi.lockVault().catch(() => {})
  }

  async function fetchFiles(page = 1) {
    const data = await vaultApi.listVaultFiles({ page, pageSize: 50 })
    files.value = data.items || []
    filesTotal.value = data.total || 0
    return data
  }

  async function uploadFile(file, onProgress) {
    if (!vmk.value) throw new Error('请先解锁保险库')
    const chunkSize = profile.value?.chunkSize || 4 * 1024 * 1024
    const maxBytes = profile.value?.maxFileBytes || 1024 * 1024 * 1024
    if (file.size > maxBytes) throw new Error('文件超过大小限制')

    const encrypted = await encryptFileForUpload(vmk.value, file, chunkSize)
    const init = await vaultApi.initVaultUpload({
      encName: encrypted.encName,
      encMime: encrypted.encMime,
      wrappedFek: encrypted.wrappedFek,
      sizePlain: encrypted.sizePlain,
      chunkCount: encrypted.chunkCount,
      chunkSize: encrypted.chunkSize,
      manifestHmac: encrypted.manifestHmac,
    })

    const { uploadId } = init
    for (let i = 0; i < encrypted.cipherChunks.length; i += 1) {
      await vaultApi.uploadVaultChunk(uploadId, i, encrypted.cipherChunks[i], (evt) => {
        if (onProgress) {
          const chunkProgress = (i + (evt.loaded / (evt.total || 1))) / encrypted.cipherChunks.length
          onProgress(Math.round(chunkProgress * 100))
        }
      })
    }

    await vaultApi.completeVaultUpload({ uploadId, sizeCipher: encrypted.sizeCipher })
    await fetchProfile()
    await fetchFiles()
  }

  async function downloadFile(fileMeta) {
    if (!vmk.value) throw new Error('请先解锁保险库')

    const info = await vaultApi.getVaultDownloadInfo(fileMeta.id)
    const meta = {
      wrappedFek: info.wrappedFek,
      encName: info.encName,
      encMime: info.encMime,
      manifestHmac: info.manifestHmac,
      chunkCount: info.chunkCount,
      chunkSize: info.chunkSize,
      sizePlain: fileMeta.sizePlain,
    }

    async function fetchChunk(index) {
      const buffer = await vaultApi.downloadVaultChunk(fileMeta.id, index)
      return new Uint8Array(buffer)
    }

    return decryptFileFromChunks(vmk.value, meta, fetchChunk)
  }

  async function decryptFileLabel(fileRow) {
    if (!vmk.value || !fileRow.wrappedFek) return '加密文件'
    try {
      const fek = await unwrapFek(vmk.value, fileRow.wrappedFek)
      return await decryptMeta(fek, fileRow.encName)
    } catch {
      return '加密文件'
    }
  }

  async function removeFile(fileId) {
    await vaultApi.deleteVaultFile(fileId)
    await fetchProfile()
    await fetchFiles()
  }

  async function submitRecoveryRequest(message, contact) {
    return vaultApi.createRecoveryRequest({ message, contact })
  }

  async function changeVaultPassword(oldPassword, newPassword, confirmPassword) {
    if (newPassword.length < 8) throw new Error('新密码至少 8 位')
    if (newPassword !== confirmPassword) throw new Error('两次密码不一致')

    if (!profile.value?.vaultSalt || !profile.value?.wrappedVmk) {
      await fetchProfile()
    }
    const { vaultSalt, wrappedVmk, kdfParams } = profile.value
    if (!vaultSalt || !wrappedVmk) throw new Error('保险库数据不完整')

    const { keyCheckB64, kek } = await deriveKeyCheckOnly(oldPassword, { vaultSalt, kdfParams })
    const vmkBytes = await decryptVmkWithKek(kek, wrappedVmk)
    const rewrap = await rewrapVmkWithPassword(vmkBytes, newPassword, vaultSalt, kdfParams)

    await vaultApi.changeVaultPassword({
      keyCheckCandidate: keyCheckB64,
      wrappedVmk: rewrap.wrappedVmkB64,
      keyCheck: rewrap.keyCheckB64,
    })

    clearVaultSession()
    vmk.value = null
    await fetchProfile()
  }

  async function completeNewPassword(recoveryToken, password, confirmPassword) {
    if (password.length < 8) throw new Error('密码至少 8 位')
    if (password !== confirmPassword) throw new Error('两次密码不一致')

    const { vmk: vmkB64 } = await vaultApi.fetchRecoveryVmk({ recoveryToken })
    const vmkBytes = b64ToBuf(vmkB64)

    const salt = profile.value?.vaultSalt
    const kdfParams = profile.value?.kdfParams
    if (!salt) throw new Error('缺少盐值')

    const rewrap = await rewrapVmkWithPassword(vmkBytes, password, salt, kdfParams)
    const result = await vaultApi.completeRecoveryPassword({
      recoveryToken,
      wrappedVmk: rewrap.wrappedVmkB64,
      keyCheck: rewrap.keyCheckB64,
    })

    setVaultSession(result.vaultSession)
    vmk.value = vmkBytes
    setStoredVmkB64(bufToB64(vmkBytes))
    await fetchProfile()
    return result
  }

  function reset() {
    profile.value = null
    vmk.value = null
    files.value = []
    filesTotal.value = 0
    clearVaultSession()
  }

  return {
    profile,
    vmk,
    files,
    filesTotal,
    loading,
    isUnlocked,
    vaultStatus,
    isInitialized,
    needsSetup,
    needsUnlock,
    needsNewPassword,
    fetchProfile,
    setupVault,
    unlock,
    lock,
    fetchFiles,
    uploadFile,
    downloadFile,
    removeFile,
    submitRecoveryRequest,
    changeVaultPassword,
    completeNewPassword,
    reset,
    decryptFileLabel,
  }
})

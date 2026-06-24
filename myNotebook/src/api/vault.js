import { get, post, del } from '@/utils/request'
import request from '@/utils/request'
import { getVaultSession } from '@/utils/vaultSession'

function vaultHeaders() {
  const session = getVaultSession()
  return session ? { 'X-Vault-Session': session } : {}
}

export function getVaultProfile() {
  return get('/vault/profile')
}

export function initVault(data) {
  return post('/vault/init', data)
}

export function unlockCheck(data) {
  return post('/vault/unlock-check', data)
}

export function lockVault() {
  return post('/vault/lock')
}

export function listVaultFiles(params) {
  return get('/vault/files', params, { headers: vaultHeaders() })
}

export function initVaultUpload(data) {
  return post('/vault/files/upload/init', data, { headers: vaultHeaders() })
}

export function uploadVaultChunk(uploadId, index, buffer, onProgress) {
  return request.post(`/vault/files/upload/${uploadId}/chunk?index=${index}`, buffer, {
    headers: {
      ...vaultHeaders(),
      'Content-Type': 'application/octet-stream',
    },
    timeout: 120000,
    onUploadProgress: onProgress,
  }).then((res) => {
    const { data } = res
    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 0 || data.code === 200) return data.data ?? data
      throw new Error(data.message || '上传失败')
    }
    return data
  })
}

export function completeVaultUpload(data) {
  return post('/vault/files/upload/complete', data, { headers: vaultHeaders() })
}

export function getVaultDownloadInfo(fileId) {
  return get(`/vault/files/${fileId}/download`, null, { headers: vaultHeaders() })
}

export function downloadVaultChunk(fileId, index) {
  return request.get(`/vault/files/${fileId}/chunk/${index}`, {
    headers: vaultHeaders(),
    responseType: 'arraybuffer',
    timeout: 120000,
  })
}

export function deleteVaultFile(fileId) {
  return del(`/vault/files/${fileId}`, null, { headers: vaultHeaders() })
}

export function createRecoveryRequest(data) {
  return post('/vault/recovery-request', data)
}

export function listMyRecoveryRequests() {
  return get('/vault/recovery-request/mine')
}

export function getRecoveryBootstrap() {
  return get('/vault/recovery/bootstrap')
}

export function fetchRecoveryVmk(data) {
  return post('/vault/recovery/vmk', data)
}

export function completeRecoveryPassword(data) {
  return post('/vault/recovery/complete', data)
}

export function changeVaultPassword(data) {
  return post('/vault/change-password', data)
}

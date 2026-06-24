const SESSION_KEY = 'vault_session'
const VMK_KEY = 'vault_vmk'

let sessionCache = sessionStorage.getItem(SESSION_KEY) || ''
let vmkCache = sessionStorage.getItem(VMK_KEY) || ''

export function getVaultSession() {
  return sessionCache
}

export function setVaultSession(token) {
  sessionCache = token || ''
  if (token) {
    sessionStorage.setItem(SESSION_KEY, token)
  } else {
    sessionStorage.removeItem(SESSION_KEY)
  }
}

export function getStoredVmkB64() {
  return vmkCache
}

export function setStoredVmkB64(b64) {
  vmkCache = b64 || ''
  if (b64) {
    sessionStorage.setItem(VMK_KEY, b64)
  } else {
    sessionStorage.removeItem(VMK_KEY)
  }
}

export function clearVaultSession() {
  setVaultSession('')
  setStoredVmkB64('')
}

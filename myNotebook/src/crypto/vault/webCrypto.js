/** Web Crypto（crypto.subtle）仅在安全上下文可用：HTTPS 或 localhost */
export function isWebCryptoAvailable() {
  return typeof globalThis.crypto !== 'undefined'
    && typeof globalThis.crypto.subtle !== 'undefined'
}

export function getWebCryptoUnavailableMessage() {
  if (typeof window === 'undefined') {
    return '当前环境无法使用加密功能'
  }
  if (!window.isSecureContext) {
    return '文件保险库需要在 HTTPS 下使用。请通过 https:// 访问本站，或为站点配置 SSL 证书。'
  }
  return '当前浏览器不支持 Web Crypto 加密 API，请更换现代浏览器（Chrome、Safari、Edge 等）后重试。'
}

export function assertWebCrypto() {
  if (!isWebCryptoAvailable()) {
    throw new Error(getWebCryptoUnavailableMessage())
  }
}

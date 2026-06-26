import { bufToB64, b64ToBuf, concatBytes } from './encoding'
import { assertWebCrypto } from './webCrypto'

export { isWebCryptoAvailable, getWebCryptoUnavailableMessage } from './webCrypto'

const KEY_CHECK_LABEL = 'mynotebook-vault-v1'
const DEFAULT_KDF = { iterations: 310000, hash: 'SHA-256' }
const IV_LEN = 12
const TAG_LEN = 16

export { DEFAULT_KDF }

export function randomBytes(length) {
  const buf = new Uint8Array(length)
  crypto.getRandomValues(buf)
  return buf
}

async function deriveKekPair(password, saltB64, kdfParams = DEFAULT_KDF) {
  assertWebCrypto()
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: b64ToBuf(saltB64),
      iterations: kdfParams.iterations || DEFAULT_KDF.iterations,
      hash: kdfParams.hash || DEFAULT_KDF.hash,
    },
    keyMaterial,
    256,
  )
  const raw = new Uint8Array(bits)
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  return { key, raw }
}

export async function deriveKek(password, saltB64, kdfParams = DEFAULT_KDF) {
  const { key } = await deriveKekPair(password, saltB64, kdfParams)
  return key
}

async function importAesKey(rawBytes) {
  return crypto.subtle.importKey('raw', rawBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function aesGcmEncrypt(key, plainBytes) {
  assertWebCrypto()
  const iv = randomBytes(IV_LEN)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes)
  const cipher = new Uint8Array(cipherBuf)
  const body = cipher.subarray(0, cipher.length - TAG_LEN)
  const tag = cipher.subarray(cipher.length - TAG_LEN)
  return concatBytes(iv, tag, body)
}

export async function aesGcmDecrypt(key, blobBytes) {
  const iv = blobBytes.subarray(0, IV_LEN)
  const tag = blobBytes.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const body = blobBytes.subarray(IV_LEN + TAG_LEN)
  const combined = concatBytes(body, tag)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined)
  return new Uint8Array(plain)
}

export async function computeKeyCheck(rawKekBytes) {
  assertWebCrypto()
  const enc = new TextEncoder()
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    rawKekBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(KEY_CHECK_LABEL))
  return new Uint8Array(sig)
}

export async function createVaultKeys(password) {
  const vmk = randomBytes(32)
  const salt = randomBytes(16)
  const saltB64 = bufToB64(salt)
  const { key: kek, raw: kekRaw } = await deriveKekPair(password, saltB64, DEFAULT_KDF)
  const wrappedVmk = await aesGcmEncrypt(kek, vmk)
  const keyCheck = await computeKeyCheck(kekRaw)
  return {
    vmk,
    saltB64,
    kdfParams: DEFAULT_KDF,
    wrappedVmkB64: bufToB64(wrappedVmk),
    keyCheckB64: bufToB64(keyCheck),
    vmkB64: bufToB64(vmk),
  }
}

export async function deriveKeyCheckOnly(password, { vaultSalt, kdfParams }) {
  const { key: kek, raw: kekRaw } = await deriveKekPair(password, vaultSalt, kdfParams)
  const keyCheck = await computeKeyCheck(kekRaw)
  return { keyCheckB64: bufToB64(keyCheck), kek }
}

export async function decryptVmkWithKek(kek, wrappedVmkB64) {
  return aesGcmDecrypt(kek, b64ToBuf(wrappedVmkB64))
}

export async function unlockVaultKeys(password, { vaultSalt, wrappedVmk, kdfParams }) {
  const { key: kek, raw: kekRaw } = await deriveKekPair(password, vaultSalt, kdfParams)
  const keyCheck = await computeKeyCheck(kekRaw)
  const vmk = await aesGcmDecrypt(kek, b64ToBuf(wrappedVmk))
  return { vmk, keyCheckB64: bufToB64(keyCheck) }
}

export async function rewrapVmkWithPassword(vmk, password, vaultSalt, kdfParams = DEFAULT_KDF) {
  const { key: kek, raw: kekRaw } = await deriveKekPair(password, vaultSalt, kdfParams)
  const wrappedVmk = await aesGcmEncrypt(kek, vmk)
  const keyCheck = await computeKeyCheck(kekRaw)
  return {
    wrappedVmkB64: bufToB64(wrappedVmk),
    keyCheckB64: bufToB64(keyCheck),
  }
}

export async function generateFek() {
  return randomBytes(32)
}

export async function wrapFek(vmk, fek) {
  const vmkKey = await importAesKey(vmk)
  const wrapped = await aesGcmEncrypt(vmkKey, fek)
  return bufToB64(wrapped)
}

export async function unwrapFek(vmk, wrappedFekB64) {
  const vmkKey = await importAesKey(vmk)
  return aesGcmDecrypt(vmkKey, b64ToBuf(wrappedFekB64))
}

export async function encryptMeta(fek, text) {
  const fekKey = await importAesKey(fek)
  const enc = new TextEncoder()
  const blob = await aesGcmEncrypt(fekKey, enc.encode(text))
  return bufToB64(blob)
}

export async function decryptMeta(fek, b64) {
  const fekKey = await importAesKey(fek)
  const plain = await aesGcmDecrypt(fekKey, b64ToBuf(b64))
  return new TextDecoder().decode(plain)
}

export async function computeManifestHmac(vmk, manifest) {
  assertWebCrypto()
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    vmk,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const enc = new TextEncoder()
  const sig = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(JSON.stringify(manifest)))
  return bufToB64(new Uint8Array(sig))
}

export async function encryptChunk(fek, plainBytes) {
  const fekKey = await importAesKey(fek)
  return aesGcmEncrypt(fekKey, plainBytes)
}

export async function decryptChunk(fek, cipherBytes) {
  const fekKey = await importAesKey(fek)
  return aesGcmDecrypt(fekKey, cipherBytes)
}

export async function encryptFileForUpload(vmk, file, chunkSize) {
  const fek = await generateFek()
  const encName = await encryptMeta(fek, file.name)
  const encMime = await encryptMeta(fek, file.type || 'application/octet-stream')
  const wrappedFek = await wrapFek(vmk, fek)

  const chunkCount = Math.max(1, Math.ceil(file.size / chunkSize))
  const manifest = { chunkCount, sizePlain: file.size, chunkSize }
  const manifestHmac = await computeManifestHmac(vmk, manifest)

  const cipherChunks = []
  let offset = 0
  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize)
    const plain = new Uint8Array(await slice.arrayBuffer())
    cipherChunks.push(await encryptChunk(fek, plain))
    offset += chunkSize
  }

  const sizeCipher = cipherChunks.reduce((sum, c) => sum + c.length, 0)

  return {
    encName,
    encMime,
    wrappedFek,
    chunkCount,
    chunkSize,
    sizePlain: file.size,
    sizeCipher,
    manifestHmac,
    cipherChunks,
  }
}

export async function decryptFileFromChunks(vmk, meta, fetchChunk) {
  const fek = await unwrapFek(vmk, meta.wrappedFek)
  const name = await decryptMeta(fek, meta.encName)
  const mime = await decryptMeta(fek, meta.encMime)

  const manifest = {
    chunkCount: meta.chunkCount,
    sizePlain: meta.sizePlain,
    chunkSize: meta.chunkSize,
  }
  const expectedHmac = await computeManifestHmac(vmk, manifest)
  if (expectedHmac !== meta.manifestHmac) {
    throw new Error('文件完整性校验失败')
  }

  const parts = []
  for (let i = 0; i < meta.chunkCount; i += 1) {
    const cipher = await fetchChunk(i)
    parts.push(await decryptChunk(fek, cipher))
  }

  const blob = new Blob(parts, { type: mime })
  return { name, mime, blob }
}

import { MAX_ATTACHMENT_SIZE_LABEL } from '@/config/upload'

export { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENT_SIZE_LABEL, MAX_AVATAR_SIZE, MAX_AVATAR_SIZE_LABEL } from '@/config/upload'

export function resolveUploadError(err, fileName) {
  const msg = (err?.message || '').trim()
  const name = fileName ? `「${fileName}」` : '文件'

  if (msg.includes('timeout') || err?.code === 'ECONNABORTED') {
    return `${name}上传超时，请检查网络后重试`
  }
  if (
    msg.includes('大小') ||
    msg.includes('too large') ||
    msg.includes('LIMIT_FILE_SIZE') ||
    err?.code === 413
  ) {
    return `${name}超出大小限制（最大 ${MAX_ATTACHMENT_SIZE_LABEL}）`
  }
  if (
    err?.code === 500 ||
    err?.code === 503 ||
    msg.includes('OSS') ||
    msg.includes('服务器') ||
    msg.includes('网络异常')
  ) {
    return msg || '服务器异常，请稍后重试'
  }
  if (msg.includes('不支持') || msg.includes('类型')) {
    return msg
  }
  return msg || `${name}上传失败`
}

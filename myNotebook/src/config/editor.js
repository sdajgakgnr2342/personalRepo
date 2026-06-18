const parsePx = (value, fallback) => {
  const num = value !== undefined && value !== '' ? Number(value) : fallback
  return Number.isFinite(num) && num > 0 ? num : fallback
}

/** 笔记内图片最小显示宽度（px） */
export const EDITOR_IMAGE_MIN_WIDTH = parsePx(import.meta.env.VITE_EDITOR_IMAGE_MIN_WIDTH, 80)

/** 笔记内图片最大显示宽度（px），超出等比缩小 */
export const EDITOR_IMAGE_MAX_WIDTH = parsePx(import.meta.env.VITE_EDITOR_IMAGE_MAX_WIDTH, 720)

/** 粘贴/上传前图片最大边长（px），超出等比压缩后上传 OSS */
export const EDITOR_IMAGE_PASTE_MAX_WIDTH = parsePx(import.meta.env.VITE_EDITOR_IMAGE_PASTE_MAX_WIDTH, 1280)

/** 粘贴/上传前 JPEG 压缩质量（0–1） */
export const EDITOR_IMAGE_PASTE_QUALITY = (() => {
  const raw = import.meta.env.VITE_EDITOR_IMAGE_PASTE_QUALITY
  const val = raw !== undefined && raw !== '' ? Number(raw) : 0.85
  return Number.isFinite(val) && val > 0 && val <= 1 ? val : 0.85
})()

/**
 * 等比例缩小图片文件（用于粘贴、上传前压缩）
 */
export function resizeImageFile(
  file,
  { maxWidth = 1280, maxHeight = 1280, quality = 0.85 } = {}
) {
  if (!file?.type?.startsWith('image/')) {
    return Promise.resolve(file)
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
      if (scale >= 1) {
        resolve(file)
        return
      }

      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('图片处理失败'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('图片压缩失败'))
            return
          }
          const ext = outputType === 'image/png' ? '.png' : '.jpg'
          const baseName = (file.name || 'image').replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${baseName}${ext}`, { type: outputType }))
        },
        outputType,
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片读取失败'))
    }

    img.src = url
  })
}

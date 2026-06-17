export function resolveAvatarUrl(avatar) {
  if (!avatar) return ''
  if (/^https?:\/\//i.test(avatar)) return avatar
  return avatar.startsWith('/') ? avatar : `/${avatar}`
}

export function getAvatarInitial(name) {
  const text = String(name || '').trim()
  return text ? text.charAt(0).toUpperCase() : 'U'
}

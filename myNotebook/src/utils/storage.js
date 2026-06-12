const PREFIX = 'mynotebook_'

export function getStorage(key) {
  const value = localStorage.getItem(PREFIX + key)
  if (value === null) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export function setStorage(key, value) {
  const data = typeof value === 'string' ? value : JSON.stringify(value)
  localStorage.setItem(PREFIX + key, data)
}

export function removeStorage(key) {
  localStorage.removeItem(PREFIX + key)
}

export function clearStorage() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => localStorage.removeItem(key))
}

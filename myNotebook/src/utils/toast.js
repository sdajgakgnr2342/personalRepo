import { reactive } from 'vue'

const state = reactive({ toasts: [] })
let idCounter = 0

export function useToastState() {
  return state
}

export function toast(message, type = 'info', duration = 3000) {
  const id = ++idCounter
  state.toasts.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
  return id
}

export function toastSuccess(message, duration) {
  return toast(message, 'success', duration ?? 3000)
}

export function toastError(message, duration) {
  return toast(message, 'error', duration ?? 4500)
}

export function toastWarning(message, duration) {
  return toast(message, 'warning', duration ?? 3500)
}

export function toastInfo(message, duration) {
  return toast(message, 'info', duration ?? 3000)
}

export function dismiss(id) {
  const idx = state.toasts.findIndex((t) => t.id === id)
  if (idx >= 0) state.toasts.splice(idx, 1)
}

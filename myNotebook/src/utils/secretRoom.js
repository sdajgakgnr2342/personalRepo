const SECRET_ROOM_KEY = 'secret-room-unlocked'

export function unlockSecretRoom() {
  sessionStorage.setItem(SECRET_ROOM_KEY, String(Date.now()))
}

export function isSecretRoomUnlocked() {
  return !!sessionStorage.getItem(SECRET_ROOM_KEY)
}

export function lockSecretRoom() {
  sessionStorage.removeItem(SECRET_ROOM_KEY)
}

import { TRACKING_CONFIG } from './trackingConfig'

let lastMoveTime = 0
let handler = null

function onMouseMove() {
  lastMoveTime = Date.now()
}

export function startMouseTracking() {
  if (handler) return
  const { mouseThrottleMs } = TRACKING_CONFIG.triggers
  let lastCall = 0
  handler = (e) => {
    const now = Date.now()
    if (now - lastCall >= mouseThrottleMs) {
      lastCall = now
      onMouseMove()
    }
  }
  document.addEventListener('mousemove', handler, { passive: true })
}

export function stopMouseTracking() {
  if (handler) {
    document.removeEventListener('mousemove', handler)
    handler = null
  }
}

export function getLastMouseMoveTime() {
  return lastMoveTime
}

export function isUserIdle(seconds) {
  return Date.now() - lastMoveTime >= seconds * 1000
}

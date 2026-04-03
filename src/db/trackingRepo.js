import { store } from './store'
import { logger } from '../lib/logger'

export function insertEvent({ eventType, productId, color, duration }) {
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  store.setRow('trackingEvents', id, {
    eventType,
    productId,
    color: color || '',
    duration: duration || 0,
    createdAt: Date.now(),
  })
  logger.track({ eventType, productId, color, duration })
  return id
}

export function getAllEvents() {
  const events = store.getTable('trackingEvents')
  return Object.entries(events)
    .map(([id, e]) => ({ ...e, id }))
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function getSessionStats() {
  const events = store.getTable('trackingEvents')
  const all = Object.values(events)
  return {
    total: all.length,
    byType: all.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1
      return acc
    }, {}),
  }
}

import { store } from './store'

export function insertEvent({ eventType, productId, color, weight }) {
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  store.setRow('trackingEvents', id, {
    eventType,
    productId,
    color: color || '',
    weight,
    analyzed: 0,
    createdAt: Date.now(),
  })
  return id
}

export function getDelta() {
  const events = store.getTable('trackingEvents')
  return Object.entries(events)
    .filter(([, e]) => e.analyzed === 0)
    .map(([id, e]) => ({ ...e, id }))
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function getAllEvents() {
  const events = store.getTable('trackingEvents')
  return Object.entries(events)
    .map(([id, e]) => ({ ...e, id }))
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function markAnalyzed() {
  const events = store.getTable('trackingEvents')
  Object.entries(events).forEach(([id, e]) => {
    if (e.analyzed === 0) {
      store.setCell('trackingEvents', id, 'analyzed', 1)
    }
  })
}

export function getSessionStats() {
  const events = store.getTable('trackingEvents')
  const all = Object.values(events)
  return {
    total: all.length,
    unanalyzed: all.filter(e => e.analyzed === 0).length,
    byType: all.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1
      return acc
    }, {}),
  }
}

import { getAllEvents } from '../db/trackingRepo'
import { getProducts } from '../db/productsRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const MAX_EVENTS = 350

// Build eventType → label lookup from config
function buildActionLabels() {
  const labels = {}
  for (const [key, cfg] of Object.entries(TRACKING_CONFIG.plp)) {
    labels[`plp.${key}`] = cfg.label
  }
  for (const [key, cfg] of Object.entries(TRACKING_CONFIG.drawer)) {
    labels[`drawer.${key}`] = cfg.label
  }
  return labels
}

const ACTION_LABELS = buildActionLabels()

function formatDuration(ms) {
  if (!ms) return ''
  const s = Math.round(ms / 1000)
  return ` (${s}s)`
}

export function formatEvents() {
  const events = getAllEvents()
  if (events.length === 0) return { text: '', totalEvents: 0 }

  const products = getProducts()
  const productMap = Object.fromEntries(products.map(p => [p.id, p]))

  // Sliding window: keep most recent events
  const windowed = events.length > MAX_EVENTS
    ? events.slice(-MAX_EVENTS)
    : events

  const t0 = windowed[0].createdAt

  const lines = windowed.map(event => {
    const product = productMap[event.productId]
    if (!product) return null

    const tSec = Math.round((event.createdAt - t0) / 1000)
    const action = ACTION_LABELS[event.eventType] || event.eventType
    const duration = formatDuration(event.duration)
    const attrs = [product.category, ...(product.styles || [])].join(', ')
    const color = event.color ? ` | ${event.color}` : ''

    return `T+${tSec}s | ${action}${duration} | ${attrs}${color}`
  }).filter(Boolean)

  return { text: lines.join('\n'), totalEvents: events.length }
}
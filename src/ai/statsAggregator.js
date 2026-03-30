import { getDelta, getAllEvents } from '../db/trackingRepo'
import { getProducts } from '../db/productsRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const HALF_LIFE_MS = TRACKING_CONFIG.decay.halfLifeSeconds * 1000

function applyDecay(weight, createdAt, now) {
  if (!TRACKING_CONFIG.decay.enabled) return weight
  const age = now - createdAt
  return weight * Math.pow(0.5, age / HALF_LIFE_MS)
}

function computeQuantitativeDecay(eventIndex, totalEvents) {
  const qConfig = TRACKING_CONFIG.decay.quantitative
  if (!qConfig || !qConfig.enabled) return 1
  const eventsAfter = totalEvents - 1 - eventIndex
  const cycles = Math.floor(eventsAfter / qConfig.eventsPerDecayCycle)
  if (cycles <= 0) return 1
  return Math.pow(qConfig.decayFactor, cycles)
}

function clampContrib(tracker, key, cap, value) {
  if (!cap) return value
  const current = tracker[key] || 0
  const remaining = cap - current
  if (remaining <= 0) return 0
  const clamped = Math.min(value, remaining)
  tracker[key] = current + clamped
  return clamped
}

function aggregate(events) {
  if (events.length === 0) {
    return {
      colorAffinity: {},
      styleAffinity: {},
      categoryAffinity: {},
      negativeSignals: {},
      topProducts: [],
      totalInteractions: 0,
    }
  }

  const products = getProducts()
  const productMap = {}
  for (const p of products) {
    productMap[p.id] = p
  }

  const now = Date.now()
  const colorAffinity = {}
  const styleAffinity = {}
  const categoryAffinity = {}
  const negativeSignals = {}
  const productScores = {}

  const caps = TRACKING_CONFIG.caps || {}
  const prodTotal = {}
  const prodColor = {}
  const prodStyle = {}
  const prodCategory = {}

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const temporalDecayed = applyDecay(event.weight, event.createdAt, now)
    const decayed = temporalDecayed * computeQuantitativeDecay(i, events.length)
    const product = productMap[event.productId]
    if (!product) continue

    // Accumulate product scores (uncapped, for top products ranking)
    productScores[event.productId] = (productScores[event.productId] || 0) + decayed

    // Negative signals tracked separately, exempt from caps
    if (decayed < 0) {
      negativeSignals[event.productId] = (negativeSignals[event.productId] || 0) + decayed
      continue
    }

    // Global per-product cap
    const cappedTotal = clampContrib(prodTotal, event.productId, caps.perProductTotal, decayed)
    if (cappedTotal <= 0) continue

    // Color from the event itself
    if (event.color) {
      const key = `${event.productId}|${event.color}`
      const cappedColor = clampContrib(prodColor, key, caps.perProductColor, cappedTotal)
      if (cappedColor > 0) {
        colorAffinity[event.color] = (colorAffinity[event.color] || 0) + cappedColor
      }
    }

    // Category from the product
    if (product.category) {
      const key = `${event.productId}|${product.category}`
      const cappedCat = clampContrib(prodCategory, key, caps.perProductCategory, cappedTotal)
      if (cappedCat > 0) {
        categoryAffinity[product.category] = (categoryAffinity[product.category] || 0) + cappedCat
      }
    }

    // Styles from the product
    if (product.styles && Array.isArray(product.styles)) {
      for (const style of product.styles) {
        const key = `${event.productId}|${style}`
        const cappedStyle = clampContrib(prodStyle, key, caps.perProductStyle, cappedTotal)
        if (cappedStyle > 0) {
          styleAffinity[style] = (styleAffinity[style] || 0) + cappedStyle
        }
      }
    }
  }

  // Build top products (top 8 by score)
  const topProducts = Object.entries(productScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, score]) => {
      const p = productMap[id]
      return {
        id,
        category: p?.category || '',
        colors: p?.variants?.map(v => v.color) || [],
        styles: p?.styles || [],
        score: Math.round(score * 10) / 10,
      }
    })

  return {
    colorAffinity,
    styleAffinity,
    categoryAffinity,
    negativeSignals,
    topProducts,
    totalInteractions: events.length,
  }
}

/** Aggregates only unanalyzed events (for LLM trigger pipeline) */
export function aggregateStats() {
  return aggregate(getDelta())
}

/** Aggregates ALL events including analyzed (for debug display) */
export function aggregateAllStats() {
  return aggregate(getAllEvents())
}

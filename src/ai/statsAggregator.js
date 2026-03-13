import { getDelta } from '../db/trackingRepo'
import { getProducts } from '../db/productsRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const HALF_LIFE_MS = TRACKING_CONFIG.decay.halfLifeSeconds * 1000

function applyDecay(weight, createdAt, now) {
  if (!TRACKING_CONFIG.decay.enabled) return weight
  const age = now - createdAt
  return weight * Math.pow(0.5, age / HALF_LIFE_MS)
}

export function aggregateStats() {
  const events = getDelta()
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

  for (const event of events) {
    const decayed = applyDecay(event.weight, event.createdAt, now)
    const product = productMap[event.productId]
    if (!product) continue

    // Accumulate product scores
    productScores[event.productId] = (productScores[event.productId] || 0) + decayed

    // Negative signals tracked separately
    if (decayed < 0) {
      negativeSignals[event.productId] = (negativeSignals[event.productId] || 0) + decayed
      continue
    }

    // Color from the event itself
    if (event.color) {
      colorAffinity[event.color] = (colorAffinity[event.color] || 0) + decayed
    }

    // Category from the product
    if (product.category) {
      categoryAffinity[product.category] = (categoryAffinity[product.category] || 0) + decayed
    }

    // Styles from the product
    if (product.styles && Array.isArray(product.styles)) {
      for (const style of product.styles) {
        styleAffinity[style] = (styleAffinity[style] || 0) + decayed
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

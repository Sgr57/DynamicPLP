import { TRACKING_CONFIG } from '../tracking/trackingConfig'

/**
 * Color families and propagation for the shoe e-commerce catalog.
 * After the LLM returns color weights, propagateColorWeights() spreads
 * weights to related colors (same family, shades, adjacent families).
 */

const COLOR_FAMILIES = {
  warm:         ['rosso', 'arancione', 'giallo', 'corallo', 'bordeaux'],
  neutral_warm: ['beige', 'cammello', 'cuoio', 'panna', 'marrone', 'marrone chiaro'],
  cool:         ['blu', 'blu scuro', 'celeste', 'verde', 'verde scuro', 'oliva', 'viola'],
  neutral:      ['nero', 'bianco', 'grigio', 'grigio chiaro'],
  accent:       ['rosa'],
}

// Bidirectional shade pairs (same base color, different lightness)
const SHADE_PAIRS = [
  ['grigio', 'grigio chiaro'],
  ['verde', 'verde scuro'],
  ['blu', 'blu scuro'],
  ['marrone', 'marrone chiaro'],
]

// Adjacent families that share some affinity
const ADJACENT_FAMILIES = [
  ['warm', 'neutral_warm'],
  ['cool', 'neutral'],
]

// Build lookup: color → family name
const colorToFamily = {}
for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
  for (const color of colors) {
    colorToFamily[color] = family
  }
}

// Build lookup: color → shade partner(s)
const shadePartners = {}
for (const [a, b] of SHADE_PAIRS) {
  shadePartners[a] = shadePartners[a] || []
  shadePartners[b] = shadePartners[b] || []
  shadePartners[a].push(b)
  shadePartners[b].push(a)
}

// Build lookup: family → adjacent families
const adjacentMap = {}
for (const [a, b] of ADJACENT_FAMILIES) {
  adjacentMap[a] = adjacentMap[a] || []
  adjacentMap[b] = adjacentMap[b] || []
  adjacentMap[a].push(b)
  adjacentMap[b].push(a)
}

/**
 * Propagate LLM color weights to related colors.
 * Only propagates from weights with |value| > minWeightToPropagate.
 * Propagated values are capped at maxPropagatedWeight.
 * Direct LLM weights are never overridden — propagation only fills gaps.
 */
export function propagateColorWeights(rawWeights) {
  const config = TRACKING_CONFIG.colorPropagation
  const result = { ...rawWeights }

  for (const [color, weight] of Object.entries(rawWeights)) {
    if (Math.abs(weight) < config.minWeightToPropagate) continue

    const family = colorToFamily[color]
    if (!family) continue

    // 1. Same family propagation
    for (const sibling of COLOR_FAMILIES[family]) {
      if (sibling === color) continue
      if (result[sibling] !== undefined) continue // don't override existing
      const propagated = weight * config.familyFactor
      result[sibling] = clampPropagated(propagated, config.maxPropagatedWeight)
    }

    // 2. Shade propagation (stronger than family)
    const partners = shadePartners[color]
    if (partners) {
      for (const partner of partners) {
        if (result[partner] !== undefined && rawWeights[partner] !== undefined) continue
        const propagated = weight * config.shadeFactor
        result[partner] = clampPropagated(propagated, config.maxPropagatedWeight)
      }
    }

    // 3. Adjacent family propagation
    const adjacents = adjacentMap[family]
    if (adjacents) {
      for (const adjFamily of adjacents) {
        for (const adjColor of COLOR_FAMILIES[adjFamily]) {
          if (result[adjColor] !== undefined) continue
          const propagated = weight * config.adjacentFactor
          result[adjColor] = clampPropagated(propagated, config.maxPropagatedWeight)
        }
      }
    }
  }

  return result
}

function clampPropagated(value, maxAbs) {
  return Math.max(-maxAbs, Math.min(maxAbs, value))
}

/** All catalog colors as a flat list (for the prompt) */
export const ALL_CATALOG_COLORS = Object.values(COLOR_FAMILIES).flat()

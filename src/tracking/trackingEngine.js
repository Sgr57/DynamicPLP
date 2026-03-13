import { insertEvent } from '../db/trackingRepo'
import { TRACKING_CONFIG } from './trackingConfig'

const cfg = TRACKING_CONFIG.plp

// Session-level set of visited productIds for revisit detection
const visitedProducts = new Set()

/**
 * Creates a PLP tracker for a single product card.
 * Returns handler functions to be wired to DOM events.
 */
export function createPLPTracker(productId, variants) {
  let hoverStartTime = null

  const handlers = {
    onMouseEnter() {
      try {
        hoverStartTime = Date.now()
      } catch (_) { /* silent */ }
    },

    onMouseLeave() {
      try {
        if (hoverStartTime === null) return
        const duration = Date.now() - hoverStartTime
        hoverStartTime = null

        // cardHoverExit: quick bounce (< maxDurationMs)
        if (cfg.cardHoverExit.enabled && duration < cfg.cardHoverExit.maxDurationMs) {
          insertEvent({
            eventType: 'plp.cardHoverExit',
            productId,
            weight: cfg.cardHoverExit.weight,
          })
          return
        }

        // cardHover: meaningful hover (>= minDurationMs)
        if (cfg.cardHover.enabled && duration >= cfg.cardHover.minDurationMs) {
          insertEvent({
            eventType: 'plp.cardHover',
            productId,
            weight: cfg.cardHover.weight,
          })
        }
      } catch (_) { /* silent */ }
    },

    onSwatchHover(color) {
      try {
        if (!cfg.swatchHover.enabled) return
        // Duration filtering is handled by ColorSwatch component via setTimeout
        insertEvent({
          eventType: 'plp.swatchHover',
          productId,
          color,
          weight: cfg.swatchHover.weight,
        })
      } catch (_) { /* silent */ }
    },

    onSwatchClick(color) {
      try {
        if (!cfg.swatchClick.enabled) return
        insertEvent({
          eventType: 'plp.swatchClick',
          productId,
          color,
          weight: cfg.swatchClick.weight,
        })
      } catch (_) { /* silent */ }
    },

    onClick() {
      try {
        if (!cfg.cardClick.enabled) return
        insertEvent({
          eventType: 'plp.cardClick',
          productId,
          weight: cfg.cardClick.weight,
        })

        // Check for revisit
        trackCardRevisit(productId)
      } catch (_) { /* silent */ }
    },
  }

  return handlers
}

/**
 * Sets up an IntersectionObserver for scroll-skip detection.
 * If a card enters and exits the viewport in < 2s without any interaction, emits a negative event.
 * Returns a cleanup function.
 */
export function createScrollObserver(productId, element) {
  try {
    if (!cfg.scrollSkip.enabled || !element) return () => {}

    let enterTime = null
    let interacted = false

    const markInteracted = () => { interacted = true }

    element.addEventListener('mouseenter', markInteracted)
    element.addEventListener('click', markInteracted)

    const observer = new IntersectionObserver(
      (entries) => {
        try {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              enterTime = Date.now()
              interacted = false
            } else if (enterTime !== null) {
              const duration = Date.now() - enterTime
              if (duration < 2000 && !interacted) {
                insertEvent({
                  eventType: 'plp.scrollSkip',
                  productId,
                  weight: cfg.scrollSkip.weight,
                })
              }
              enterTime = null
            }
          }
        } catch (_) { /* silent */ }
      },
      { threshold: 0.5 }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
      element.removeEventListener('mouseenter', markInteracted)
      element.removeEventListener('click', markInteracted)
    }
  } catch (_) {
    return () => {}
  }
}

/**
 * Tracks card revisits. If the productId was already visited in this session,
 * emits a cardRevisit event.
 */
export function trackCardRevisit(productId, color) {
  try {
    if (!cfg.cardRevisit.enabled) return
    if (visitedProducts.has(productId)) {
      insertEvent({
        eventType: 'plp.cardRevisit',
        productId,
        color,
        weight: cfg.cardRevisit.weight,
      })
    } else {
      visitedProducts.add(productId)
    }
  } catch (_) { /* silent */ }
}

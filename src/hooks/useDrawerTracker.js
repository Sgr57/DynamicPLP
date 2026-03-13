import { useEffect, useRef, useCallback } from 'react'
import { insertEvent } from '../db/trackingRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const cfg = TRACKING_CONFIG.drawer

// Session-level set of product IDs that have been opened in the drawer
const openedProducts = new Set()

/**
 * Hook that manages drawer-specific tracking events.
 * Activates when `isOpen` is true and tracks open/close duration,
 * variant interactions, and cycling behavior.
 *
 * @param {object} product - The product being displayed in the drawer
 * @param {boolean} isOpen - Whether the drawer is currently open
 * @returns {{ onVariantHover: function, onVariantClick: function }}
 */
export function useDrawerTracker(product, isOpen) {
  const openTimeRef = useRef(null)
  const visitedVariantsRef = useRef(new Set())
  const cyclingEmittedRef = useRef(false)
  const hoverTimerRef = useRef(null)

  // Track open / reopen when the drawer opens
  useEffect(() => {
    if (!isOpen || !product) return

    try {
      openTimeRef.current = Date.now()
      visitedVariantsRef.current = new Set()
      cyclingEmittedRef.current = false

      const isReopen = openedProducts.has(product.id)

      if (isReopen && cfg.reopen.enabled) {
        insertEvent({
          eventType: 'drawer.reopen',
          productId: product.id,
          weight: cfg.reopen.weight,
        })
      } else if (cfg.open.enabled) {
        insertEvent({
          eventType: 'drawer.open',
          productId: product.id,
          weight: cfg.open.weight,
        })
        openedProducts.add(product.id)
      }
    } catch (_) { /* silent */ }

    // Cleanup: emit quickClose or timeSpent when drawer closes
    return () => {
      try {
        if (hoverTimerRef.current !== null) {
          clearTimeout(hoverTimerRef.current)
          hoverTimerRef.current = null
        }

        if (openTimeRef.current === null) return
        const duration = Date.now() - openTimeRef.current
        openTimeRef.current = null

        if (cfg.quickClose.enabled && duration < cfg.quickClose.maxDurationMs) {
          insertEvent({
            eventType: 'drawer.quickClose',
            productId: product.id,
            weight: cfg.quickClose.weight,
          })
        } else if (cfg.timeSpent.enabled && duration >= cfg.timeSpent.minDurationMs) {
          insertEvent({
            eventType: 'drawer.timeSpent',
            productId: product.id,
            weight: cfg.timeSpent.weight,
          })
        }
      } catch (_) { /* silent */ }
    }
  }, [isOpen, product?.id])

  const onVariantHover = useCallback(
    (color) => {
      try {
        if (!cfg.variantHover.enabled || !product) return

        // Clear any previous hover timer
        if (hoverTimerRef.current !== null) {
          clearTimeout(hoverTimerRef.current)
        }

        hoverTimerRef.current = setTimeout(() => {
          try {
            insertEvent({
              eventType: 'drawer.variantHover',
              productId: product.id,
              color,
              weight: cfg.variantHover.weight,
            })
          } catch (_) { /* silent */ }
          hoverTimerRef.current = null
        }, cfg.variantHover.minDurationMs)
      } catch (_) { /* silent */ }
    },
    [product?.id]
  )

  const onVariantClick = useCallback(
    (color) => {
      try {
        if (!product) return

        // Track variant click
        if (cfg.variantClick.enabled) {
          insertEvent({
            eventType: 'drawer.variantClick',
            productId: product.id,
            color,
            weight: cfg.variantClick.weight,
          })
        }

        // Track variant cycling
        visitedVariantsRef.current.add(color)
        if (
          cfg.variantCycling.enabled &&
          !cyclingEmittedRef.current &&
          visitedVariantsRef.current.size >= cfg.variantCycling.minVariants
        ) {
          cyclingEmittedRef.current = true
          insertEvent({
            eventType: 'drawer.variantCycling',
            productId: product.id,
            weight: cfg.variantCycling.weight,
          })
        }
      } catch (_) { /* silent */ }
    },
    [product?.id]
  )

  return { onVariantHover, onVariantClick }
}

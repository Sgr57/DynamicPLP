import { useState, useEffect, useRef, useCallback } from 'react'
import { aggregateStats } from '../ai/statsAggregator'
import { shouldTrigger } from '../ai/triggerEngine'
import { buildPrompt } from '../lib/promptBuilder'
import { parseResponse } from '../lib/responseParser'
import { propagateColorWeights } from '../lib/colorFamilies'
import { rankProducts } from '../lib/reranker'
import { getProducts, updatePositions } from '../db/productsRepo'
import {
  getWeights,
  saveWeights,
  saveStatsSnapshot,
  getStatsSnapshot,
  setMemoryValue,
  getMemoryValue,
} from '../db/aiMemoryRepo'
import { markAnalyzed } from '../db/trackingRepo'
import { isUserIdle } from '../tracking/mouseActivityTracker'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const { reorderInactivitySeconds } = TRACKING_CONFIG.triggers

export function useReranker(generate, engineReady, drawerProductId) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastReasoning, setLastReasoning] = useState('')
  const [products, setProducts] = useState(() => getProducts())
  const [currentWeights, setCurrentWeights] = useState(() => getWeights())
  const isAnalyzingRef = useRef(false)
  const pendingReorderRef = useRef(false)

  // Pre-ranking on mount using last_weights
  useEffect(() => {
    const lastWeights = getWeights()
    if (lastWeights) {
      try {
        const currentProducts = getProducts()
        const orderedIds = rankProducts(currentProducts, lastWeights)
        updatePositions(orderedIds)
        setProducts(getProducts())
      } catch {
        // Silent fallback
      }
    }
  }, [])

  const refreshProducts = useCallback(() => {
    setProducts(getProducts())
  }, [])

  // Flow A: LLM invocation pipeline
  useEffect(() => {
    if (!engineReady || !generate) return

    const interval = setInterval(async () => {
      if (isAnalyzingRef.current) return

      try {
        const stats = aggregateStats()
        if (stats.totalInteractions === 0) return

        console.log('[DynamicPLP] Stats:', {
          interactions: stats.totalInteractions,
          colors: stats.colorAffinity,
          styles: stats.styleAffinity,
          categories: stats.categoryAffinity,
        })

        if (!shouldTrigger(stats)) return
        console.log('[DynamicPLP] Trigger fired — calling LLM')

        isAnalyzingRef.current = true
        setIsAnalyzing(true)

        const userProfile = getMemoryValue('user_profile') || ''
        const messages = buildPrompt(stats, userProfile)

        console.log('[DynamicPLP] Prompt sent to LLM:')
        messages.forEach(m => console.log(`[DynamicPLP]   ${m.role}:`, m.content))

        let weights
        try {
          const text = await generate(messages)
          console.log('[DynamicPLP] Raw LLM output:', text)
          weights = parseResponse(text, getWeights())
        } catch (err) {
          console.error('[DynamicPLP] LLM generate() error:', err)
          weights = getWeights()
        }

        if (weights) {
          // Propagate color weights to related colors (families, shades)
          try {
            weights.color_weights = propagateColorWeights(weights.color_weights)
          } catch (err) {
            console.warn('[DynamicPLP] Color propagation failed, using raw weights:', err)
          }
          console.log('[DynamicPLP] LLM weights (with propagation):', weights)
          saveWeights(weights)
          setCurrentWeights(weights)
          if (weights.user_profile) {
            setMemoryValue('user_profile', weights.user_profile)
          }
          saveStatsSnapshot(stats)
          setMemoryValue('last_analysis_at', Date.now())
          markAnalyzed()

          if (weights.reasoning) {
            setLastReasoning(weights.reasoning)
          }

          // Mark reorder as pending — will apply when user is idle
          pendingReorderRef.current = true
          console.log('[DynamicPLP] Weights saved, reorder pending (waiting for user idle)')
        }
      } catch {
        // Silent error handling
      } finally {
        isAnalyzingRef.current = false
        setIsAnalyzing(false)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [engineReady, generate])

  // Flow B: Reorder when user is idle
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pendingReorderRef.current) return
      if (!isUserIdle(reorderInactivitySeconds)) return

      console.log('[DynamicPLP] Reorder applied (user idle)')
      pendingReorderRef.current = false

      const weights = getWeights()
      if (!weights) return

      const currentProducts = getProducts()
      const orderedIds = rankProducts(currentProducts, weights)

      // Anchor the drawer product: exclude from reorder
      if (drawerProductId) {
        const drawerIdx = orderedIds.indexOf(drawerProductId)
        if (drawerIdx !== -1) {
          orderedIds.splice(drawerIdx, 1)
          const currentPos = currentProducts.find(p => p.id === drawerProductId)?.position || 0
          orderedIds.splice(currentPos, 0, drawerProductId)
        }
      }

      updatePositions(orderedIds)
      setProducts(getProducts())
    }, 1000)

    return () => clearInterval(interval)
  }, [drawerProductId])

  return { isAnalyzing, lastReasoning, products, refreshProducts, currentWeights }
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { aggregateStats } from '../ai/statsAggregator'
import { shouldTrigger } from '../ai/triggerEngine'
import { buildPrompt } from '../lib/promptBuilder'
import { parseLLMResponse } from '../lib/jsonParser'
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

export function useReranker(generate, engineReady, drawerProductId) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastReasoning, setLastReasoning] = useState('')
  const [products, setProducts] = useState(() => getProducts())
  const [currentWeights, setCurrentWeights] = useState(() => getWeights())
  const isAnalyzingRef = useRef(false)

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

  // Pipeline loop
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
        const { system, user } = buildPrompt(stats, userProfile)

        const messages = [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]

        console.log('[DynamicPLP] Prompt sent to LLM:')
        console.log('[DynamicPLP]   System:', system)
        console.log('[DynamicPLP]   User:', user)

        let weights
        try {
          const text = await generate(messages)
          console.log('[DynamicPLP] Raw LLM output:', text)
          weights = parseLLMResponse(text, getWeights())
        } catch (err) {
          console.error('[DynamicPLP] LLM generate() error:', err)
          weights = getWeights()
        }

        if (weights) {
          console.log('[DynamicPLP] LLM weights:', weights)
          saveWeights(weights)
          setCurrentWeights(weights)
          if (weights.user_profile) {
            setMemoryValue('user_profile', weights.user_profile)
          }
          saveStatsSnapshot(stats)
          setMemoryValue('last_analysis_at', Date.now())
          markAnalyzed()

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

          if (weights.reasoning) {
            setLastReasoning(weights.reasoning)
          }
        }
      } catch {
        // Silent error handling
      } finally {
        isAnalyzingRef.current = false
        setIsAnalyzing(false)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [engineReady, generate, drawerProductId])

  return { isAnalyzing, lastReasoning, products, refreshProducts, currentWeights }
}

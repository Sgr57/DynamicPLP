import { useState, useEffect, useRef, useCallback } from 'react'
import { formatEvents } from '../ai/eventFormatter'
import { shouldTrigger } from '../ai/triggerEngine'
import { buildPrompt } from '../lib/promptBuilder'
import { parseResponse } from '../lib/responseParser'
import { propagateColorWeights } from '../lib/colorFamilies'
import { rankProducts } from '../lib/reranker'
import { getProducts, updatePositions } from '../db/productsRepo'
import {
  getWeights,
  saveWeights,
  setMemoryValue,
  getMemoryValue,
} from '../db/aiMemoryRepo'
import { isUserIdle } from '../tracking/mouseActivityTracker'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'
import { logger } from '../lib/logger'

const { reorderInactivitySeconds } = TRACKING_CONFIG.triggers

export function useReranker(generate, engineReady, drawerProductId) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [lastMessage, setLastMessage] = useState('')
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
        const tFmt0 = performance.now()
        const { text: eventsText, totalEvents } = formatEvents()
        const tFmt = Math.round(performance.now() - tFmt0)
        if (totalEvents === 0) return

        const tTrig0 = performance.now()
        if (!shouldTrigger()) return
        const tTrig = Math.round(performance.now() - tTrig0)

        isAnalyzingRef.current = true
        setIsAnalyzing(true)

        const tBuild0 = performance.now()
        const userProfile = getMemoryValue('user_profile') || ''
        const messages = buildPrompt(eventsText, userProfile)
        const tBuild = Math.round(performance.now() - tBuild0)

        logger.llmSend(totalEvents)
        logger.llmSendDetail(messages)

        let weights
        let tInfer = 0, tParse = 0, tProp = 0
        const t0 = performance.now()
        try {
          const text = await generate(messages)
          tInfer = Math.round(performance.now() - t0)
          logger.llmRecv(tInfer)
          logger.llmRecvDetail(text)
          const tParse0 = performance.now()
          weights = parseResponse(text, getWeights())
          tParse = Math.round(performance.now() - tParse0)
        } catch (err) {
          logger.llmError(err)
          weights = getWeights()
        }

        if (weights) {
          try {
            const tProp0 = performance.now()
            weights.color_weights = propagateColorWeights(weights.color_weights)
            tProp = Math.round(performance.now() - tProp0)
          } catch (err) {
            logger.warn('llm', 'color propagation fallita, uso pesi raw')
          }
          logger.pipeline({
            formatEvents: tFmt,
            trigger: tTrig,
            buildPrompt: tBuild,
            inference: tInfer,
            parseResponse: tParse,
            colorPropag: tProp,
          })
          logger.llmWeights(weights)
          saveWeights(weights)
          setCurrentWeights(weights)
          if (weights.user_profile) {
            setMemoryValue('user_profile', weights.user_profile)
          }
          setMemoryValue('last_analysis_at', Date.now())
          setMemoryValue('last_event_count', totalEvents)

          if (weights.confidence != null) {
            setMemoryValue('confidence', weights.confidence)
          }
          if (weights.intent) {
            setMemoryValue('intent', weights.intent)
          }
          if (weights.message) {
            setMemoryValue('message', weights.message)
            setLastMessage(weights.message)
          }

          pendingReorderRef.current = true
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

      pendingReorderRef.current = false

      const weights = getWeights()
      if (!weights) return

      const currentProducts = getProducts()
      const orderedIds = rankProducts(currentProducts, weights)

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
      logger.reorder(`applicato (user idle ${reorderInactivitySeconds}s)`)
    }, 1000)

    return () => clearInterval(interval)
  }, [drawerProductId])

  return { isAnalyzing, lastMessage, products, refreshProducts, currentWeights }
}

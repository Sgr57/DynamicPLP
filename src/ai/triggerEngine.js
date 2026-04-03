import { getAllEvents } from '../db/trackingRepo'
import { getMemoryValue } from '../db/aiMemoryRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'
import { logger } from '../lib/logger'

const { minInteractions, cooldownAfterAnalysis } = TRACKING_CONFIG.triggers

const INTENT_COOLDOWNS = { exploring: 45, deciding: 30, focused: 15 }

export function shouldTrigger() {
  const events = getAllEvents()

  if (events.length < minInteractions) {
    logger.trigger(false, `eventi insufficienti (${events.length}/${minInteractions})`)
    return false
  }

  const now = Date.now()
  const lastAnalysisAt = getMemoryValue('last_analysis_at')
  if (lastAnalysisAt) {
    const intent = getMemoryValue('intent') || 'deciding'
    const cooldown = INTENT_COOLDOWNS[intent] || cooldownAfterAnalysis
    const cooldownRemaining = Math.round((cooldown * 1000 - (now - lastAnalysisAt)) / 1000)
    if (cooldownRemaining > 0) {
      logger.trigger(false, `cooldown attivo (${cooldownRemaining}s, intent=${intent})`)
      return false
    }
  }

  const lastEventCount = getMemoryValue('last_event_count')
  if (lastEventCount !== null && events.length <= lastEventCount) {
    logger.trigger(false, 'nessun nuovo evento')
    return false
  }

  logger.trigger(true, 'condizioni soddisfatte')
  return true
}

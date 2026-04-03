import { getAllEvents } from '../db/trackingRepo'
import { getMemoryValue } from '../db/aiMemoryRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'
import { logger } from '../lib/logger'

const { minInteractions, cooldownAfterAnalysis, minNewEvents } = TRACKING_CONFIG.triggers

const INTENT_COOLDOWNS = { exploring: 0, deciding: 0, focused: 0 }

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
  if (lastEventCount !== null) {
    const newEvents = events.length - lastEventCount
    if (newEvents < minNewEvents) {
      logger.trigger(false, `nuovi eventi insufficienti (${newEvents}/${minNewEvents})`)
      return false
    }
  }

  logger.trigger(true, 'condizioni soddisfatte')
  return true
}

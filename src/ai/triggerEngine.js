import { getDelta } from '../db/trackingRepo'
import { getMemoryValue, getStatsSnapshot } from '../db/aiMemoryRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const { minInteractions, inactivitySeconds, cooldownAfterAnalysis, significantDelta } =
  TRACKING_CONFIG.triggers

export function shouldTrigger(currentStats) {
  const events = getDelta()

  // 1. Minimum interactions
  if (events.length < minInteractions) return false

  // 2. Inactivity check: user must be idle for at least inactivitySeconds
  const now = Date.now()
  const lastEventTime = Math.max(...events.map(e => e.createdAt))
  const inactivityMs = now - lastEventTime
  if (inactivityMs < inactivitySeconds * 1000) return false

  // 3. Cooldown since last analysis
  const lastAnalysisAt = getMemoryValue('last_analysis_at')
  if (lastAnalysisAt && (now - lastAnalysisAt) < cooldownAfterAnalysis * 1000) return false

  // 4. Significant delta: at least one attribute changed > significantDelta points vs snapshot
  const lastSnapshot = getStatsSnapshot()
  if (!lastSnapshot) return true // First analysis, always significant

  const hasSigDelta = checkSignificantDelta(currentStats, lastSnapshot)
  return hasSigDelta
}

function checkSignificantDelta(current, previous) {
  const dimensions = ['colorAffinity', 'styleAffinity', 'categoryAffinity']
  for (const dim of dimensions) {
    const curr = current[dim] || {}
    const prev = previous[dim] || {}
    const allKeys = new Set([...Object.keys(curr), ...Object.keys(prev)])
    for (const key of allKeys) {
      const diff = Math.abs((curr[key] || 0) - (prev[key] || 0))
      if (diff > significantDelta) return true
    }
  }
  return false
}

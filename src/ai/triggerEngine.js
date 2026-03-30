import { getDelta } from '../db/trackingRepo'
import { getMemoryValue, getStatsSnapshot } from '../db/aiMemoryRepo'
import { TRACKING_CONFIG } from '../tracking/trackingConfig'

const { minInteractions, inactivitySeconds, cooldownAfterAnalysis, significantDelta } =
  TRACKING_CONFIG.triggers

export function shouldTrigger(currentStats) {
  const events = getDelta()

  // 1. Minimum interactions
  if (events.length < minInteractions) {
    console.log(`[DynamicPLP] Trigger: not enough events (${events.length}/${minInteractions})`)
    return false
  }

  // 2. Inactivity check: user must be idle for at least inactivitySeconds
  const now = Date.now()
  const lastEventTime = Math.max(...events.map(e => e.createdAt))
  const idleSeconds = Math.round((now - lastEventTime) / 1000)
  if (idleSeconds < inactivitySeconds) {
    console.log(`[DynamicPLP] Trigger: user still active (${idleSeconds}s idle, need ${inactivitySeconds}s)`)
    return false
  }

  // 3. Cooldown since last analysis
  const lastAnalysisAt = getMemoryValue('last_analysis_at')
  if (lastAnalysisAt) {
    const cooldownRemaining = Math.round((cooldownAfterAnalysis * 1000 - (now - lastAnalysisAt)) / 1000)
    if (cooldownRemaining > 0) {
      console.log(`[DynamicPLP] Trigger: cooldown active (${cooldownRemaining}s remaining)`)
      return false
    }
  }

  // 4. Significant delta: at least one attribute changed > significantDelta points vs snapshot
  const lastSnapshot = getStatsSnapshot()
  if (!lastSnapshot) {
    console.log('[DynamicPLP] Trigger: PASS (first analysis, no previous snapshot)')
    return true
  }

  const hasSigDelta = checkSignificantDelta(currentStats, lastSnapshot)
  if (!hasSigDelta) {
    console.log('[DynamicPLP] Trigger: no significant delta vs last snapshot')
    return false
  }

  console.log('[DynamicPLP] Trigger: PASS (all conditions met)')
  return true
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

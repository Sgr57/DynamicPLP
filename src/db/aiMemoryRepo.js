import { store } from './store'

export function getMemoryValue(key) {
  const row = store.getRow('aiMemory', key)
  if (!row || !row.value) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return row.value
  }
}

export function setMemoryValue(key, value) {
  store.setRow('aiMemory', key, {
    value: typeof value === 'string' ? value : JSON.stringify(value),
    updatedAt: Date.now(),
  })
}

export function saveWeights(weights) {
  setMemoryValue('last_weights', weights)
}

export function getWeights() {
  return getMemoryValue('last_weights')
}

export function saveStatsSnapshot(snapshot) {
  setMemoryValue('last_stats_snapshot', snapshot)
}

export function getStatsSnapshot() {
  return getMemoryValue('last_stats_snapshot')
}

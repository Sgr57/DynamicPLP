import { store } from '../db/store'

export function exportData() {
  const data = JSON.stringify(store.getContent(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plp_demo_export.json'
  a.click()
  URL.revokeObjectURL(url)
}

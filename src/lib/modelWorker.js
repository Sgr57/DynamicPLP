import { createModelAdapter } from './modelAdapter'

let adapter = null
let aborted = false

self.addEventListener('message', async (e) => {
  const { type, id, data } = e.data

  try {
    if (type === 'load') {
      adapter = await createModelAdapter()
      await adapter.load((progress) => {
        self.postMessage({ type: 'progress', progress })
      })
      self.postMessage({ type: 'ready' })
      return
    }

    if (type === 'generate') {
      aborted = false
      const result = await adapter.generate(data.messages)
      if (!aborted) {
        self.postMessage({ type: 'result', id, output: result })
      }
      return
    }

    if (type === 'abort') {
      aborted = true
      return
    }

    if (type === 'dispose') {
      adapter?.dispose()
      adapter = null
      self.postMessage({ type: 'disposed' })
    }
  } catch (error) {
    if (!aborted) {
      self.postMessage({ type: 'error', id, message: error.message })
    }
  }
})

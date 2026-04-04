import { createModelAdapter } from './modelAdapter'

let adapter = null

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
      const result = await adapter.generate(data.messages)
      self.postMessage({ type: 'result', id, output: result })
      return
    }

    if (type === 'dispose') {
      adapter?.dispose()
      adapter = null
      self.postMessage({ type: 'disposed' })
    }
  } catch (error) {
    self.postMessage({ type: 'error', id, message: error.message })
  }
})

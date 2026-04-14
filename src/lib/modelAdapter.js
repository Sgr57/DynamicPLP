import { MODEL_CONFIG } from '../data/modelConfig'

export async function createModelAdapter() {
  const { TransformersJsAdapter } = await import('./adapters/transformersJsAdapter.js')
  const adapter = new TransformersJsAdapter(MODEL_CONFIG, MODEL_CONFIG)
  if (MODEL_CONFIG.enableThinking !== undefined) {
    adapter._enableThinking = MODEL_CONFIG.enableThinking
  }
  return adapter
}

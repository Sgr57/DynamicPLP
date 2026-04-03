import { MODEL_CONFIG } from '../data/modelConfig'

export async function createModelAdapter() {
  if (MODEL_CONFIG.backend === 'web-llm') {
    const { WebLlmAdapter } = await import('./adapters/webLlmAdapter.js')
    return new WebLlmAdapter(MODEL_CONFIG.webLlm, MODEL_CONFIG)
  }

  const { TransformersJsAdapter } = await import('./adapters/transformersJsAdapter.js')
  return new TransformersJsAdapter(MODEL_CONFIG.transformersJs, MODEL_CONFIG)
}

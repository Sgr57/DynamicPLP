import { MODEL_CONFIG } from '../data/modelConfig'

export async function createModelAdapter() {
  const { TransformersJsAdapter } = await import('./adapters/transformersJsAdapter.js')
  return new TransformersJsAdapter(MODEL_CONFIG, MODEL_CONFIG)
}

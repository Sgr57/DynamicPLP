export const MODEL_CONFIG = {
  // Transformers.js backend (Gemma 4 E2B)
  model: 'onnx-community/gemma-4-E2B-it-ONNX',
  dtype: 'q4f16',
  device: 'webgpu',
  label: 'Gemma 4 E2B',

  // Shared inference parameters
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 200,
  inferenceTimeout: 30000,
}

export const MODEL_LABEL = MODEL_CONFIG.label

export const MODEL_CONFIG = {
  // Switch between 'web-llm' and 'transformers-js'
  backend: 'transformers-js',

  // web-llm backend (Qwen 2.5 1.5B)
  webLlm: {
    model: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    label: 'Qwen 2.5 1.5B',
  },

  // transformers.js backend (Gemma 4 E2B)
  transformersJs: {
    model: 'onnx-community/gemma-4-E2B-it-ONNX',
    dtype: 'q4f16',
    device: 'webgpu',
    label: 'Gemma 4 E2B',
  },

  // Shared inference parameters
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 200,
  inferenceTimeout: 30000,
}

export const MODEL_LABEL = MODEL_CONFIG.backend === 'web-llm'
  ? MODEL_CONFIG.webLlm.label
  : MODEL_CONFIG.transformersJs.label

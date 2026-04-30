const MODELS = {
  'qwen3-0.6b': {
    model: 'onnx-community/Qwen3-0.6B-ONNX',
    dtype: 'q4f16',
    device: 'webgpu',
    label: 'Qwen3 0.6B',
    enableThinking: false,
  },
  'gemma4-e2b': {
    model: 'onnx-community/gemma-4-E2B-it-ONNX',
    dtype: 'q4f16',
    device: 'webgpu',
    label: 'Gemma 4 E2B',
  },
  'gemma3-270m-plp': {
    model: 'edorazio/gemma-3-270m-it-dynamicplp',
    dtype: 'q4f16',
    device: 'webgpu',
    label: 'Gemma 3 270M (PLP fine-tune)',
    useFewShot: false,
  },
}

// ← Switch active model here
const ACTIVE_MODEL = 'gemma3-270m-plp'

export const MODEL_CONFIG = {
  ...MODELS[ACTIVE_MODEL],

  // Shared inference parameters
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 200,
  inferenceTimeout: 30000,
}

export const MODEL_LABEL = MODEL_CONFIG.label

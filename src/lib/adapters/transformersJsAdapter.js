import {
  AutoTokenizer,
  Gemma4ForConditionalGeneration,
} from '@huggingface/transformers'

async function detectDevice(preferred) {
  if (preferred !== 'webgpu') return preferred
  if (typeof navigator === 'undefined' || !navigator.gpu) return 'wasm'
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

export class TransformersJsAdapter {
  constructor(backendConfig, sharedConfig) {
    this.modelId = backendConfig.model
    this.dtype = backendConfig.dtype
    this.device = backendConfig.device
    this.sharedConfig = sharedConfig
    this.tokenizer = null
    this.model = null
  }

  async load(onProgress) {
    let lastUpdate = 0
    let maxPercentage = 0
    const THROTTLE_MS = 250

    const throttledProgress = (text, percentage) => {
      percentage = Math.round(percentage)
      // Ensure monotonic progress
      if (percentage > maxPercentage) maxPercentage = percentage
      else percentage = maxPercentage

      const now = Date.now()
      const isMilestone = percentage === 0 || percentage === 10 || percentage === 100
      if (!isMilestone && now - lastUpdate < THROTTLE_MS) return
      lastUpdate = now
      onProgress({ text, percentage })
    }

    const resolvedDevice = await detectDevice(this.device)
    if (resolvedDevice !== this.device) {
      console.warn('[PLP] WebGPU non disponibile, fallback a WASM')
      this.device = resolvedDevice
    }

    throttledProgress('Caricamento tokenizer...', 0)

    this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId, {
      progress_callback: (p) => {
        // v4: tokenizer doesn't emit progress_total, use per-file progress
        if (p.status === 'progress' && p.progress > 0) {
          throttledProgress('Caricamento tokenizer...', p.progress * 0.1)
        }
      },
    })

    throttledProgress('Download pesi del modello...', 10)

    let initiatedFiles = 0
    let doneFiles = 0
    let hasTotalProgress = false

    this.model = await Gemma4ForConditionalGeneration.from_pretrained(this.modelId, {
      dtype: this.dtype,
      device: this.device,
      progress_callback: (p) => {
        if (p.status === 'initiate') {
          initiatedFiles++
        } else if (p.status === 'progress_total' && p.progress > 0) {
          // Best signal: aggregated progress across all files (fresh download)
          hasTotalProgress = true
          const loadedMB = (p.loaded / 1024 / 1024).toFixed(0)
          throttledProgress(`Download: ${loadedMB} MB`, 10 + p.progress * 0.9)
        } else if (p.status === 'done') {
          doneFiles++
          // Fallback for cache hits: progress_total stays at 0 when
          // content-length is missing, so use file-count ratio instead
          if (!hasTotalProgress && initiatedFiles > 0) {
            const fileProgress = (doneFiles / initiatedFiles) * 100
            throttledProgress('Caricamento dalla cache...', 10 + fileProgress * 0.9)
          }
        }
      },
    })

    throttledProgress('Modello pronto!', 100)
  }

  async generate(messages) {
    if (!this.tokenizer || !this.model) throw new Error('Model not ready')

    const prompt = this.tokenizer.apply_chat_template(messages, {
      tokenize: false,
      add_generation_prompt: true,
      enable_thinking: false,
    })

    const inputs = await this.tokenizer(prompt, {
      add_special_tokens: false,
      return_tensors: 'pt',
    })

    const outputTokens = await this.model.generate({
      ...inputs,
      max_new_tokens: this.sharedConfig.max_tokens,
      do_sample: true,
      temperature: this.sharedConfig.temperature,
      top_p: this.sharedConfig.top_p,
    })

    // Decode only the generated tokens (skip input)
    const inputLength = inputs.input_ids.dims.at(-1)
    const generatedTokens = outputTokens.slice(null, [inputLength, null])
    const decoded = this.tokenizer.batch_decode(generatedTokens, {
      skip_special_tokens: true,
    })

    return decoded[0]
  }

  async dispose() {
    try {
      await this.model?.dispose?.()
    } catch {
      // Ignore errors during cleanup
    }
    this.model = null
    this.tokenizer = null
  }
}

import {
  AutoTokenizer,
  Gemma4ForConditionalGeneration,
} from '@huggingface/transformers'

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
    onProgress({ text: 'Loading tokenizer...', percentage: 0 })

    this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId, {
      progress_callback: (p) => {
        if (p.status === 'progress') {
          onProgress({
            text: `Loading tokenizer: ${p.file || ''}`,
            percentage: Math.round((p.progress || 0) * 0.1),
          })
        }
      },
    })

    onProgress({ text: 'Loading model weights...', percentage: 10 })

    this.model = await Gemma4ForConditionalGeneration.from_pretrained(this.modelId, {
      dtype: this.dtype,
      device: this.device,
      progress_callback: (p) => {
        if (p.status === 'progress') {
          onProgress({
            text: p.file ? `Downloading ${p.file}` : 'Loading model...',
            percentage: 10 + Math.round((p.progress || 0) * 0.9),
          })
        }
      },
    })

    onProgress({ text: 'Model ready', percentage: 100 })
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

  dispose() {
    this.model = null
    this.tokenizer = null
  }
}

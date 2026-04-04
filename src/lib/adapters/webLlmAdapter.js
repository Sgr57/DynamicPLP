import { CreateMLCEngine } from '@mlc-ai/web-llm'

export class WebLlmAdapter {
  constructor(backendConfig, sharedConfig) {
    this.modelId = backendConfig.model
    this.sharedConfig = sharedConfig
    this.engine = null
  }

  async load(onProgress) {
    this.engine = await CreateMLCEngine(this.modelId, {
      initProgressCallback: (p) => {
        onProgress({
          text: p.text || '',
          percentage: Math.round((p.progress || 0) * 100),
        })
      },
    })
  }

  async generate(messages) {
    if (!this.engine) throw new Error('Engine not ready')

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: this.sharedConfig.temperature,
      top_p: this.sharedConfig.top_p,
      max_tokens: this.sharedConfig.max_tokens,
    })

    return reply.choices[0].message.content
  }

  dispose() {
    if (this.engine?.unload) {
      this.engine.unload()
    }
    this.engine = null
  }
}

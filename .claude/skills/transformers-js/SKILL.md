---
name: transformers-js
description: >
  Guide for using Transformers.js (v3+, @huggingface/transformers) to run Hugging Face ML models
  in the browser via ONNX Runtime. Covers pipeline() API, AutoModel/AutoTokenizer/AutoProcessor
  low-level API, TextStreamer, WebGPU acceleration, quantization (fp32/fp16/q8/q4/q4f16),
  per-module dtype, Web Worker patterns, singleton pipeline reuse, and browser model caching.
  Use when working with @huggingface/transformers, Transformers.js, or building client-side ML
  inference for tasks including: text-generation, text-classification, sentiment-analysis, NER,
  question-answering, summarization, translation, fill-mask, zero-shot-classification,
  feature-extraction, image-classification, object-detection, image-segmentation, depth-estimation,
  background-removal, automatic-speech-recognition, audio-classification, text-to-speech,
  image-to-text, document-question-answering, zero-shot-image-classification, or
  zero-shot-object-detection. Also use for React/Vite/Next.js integration and bundler configuration.
---

# Transformers.js v3+ (Browser)

Run Hugging Face ML models entirely in the browser via ONNX Runtime. WebGPU for GPU acceleration, WASM as fallback.

## References

Consult these based on the task at hand:

- [references/pipelines.md](references/pipelines.md) — All pipeline tasks with input/output formats, options, and recommended models. Read when working with a specific task.
- [references/low-level-api.md](references/low-level-api.md) — AutoModel, AutoTokenizer, AutoProcessor, RawImage, manual inference. Read when pipeline() is insufficient.
- [references/performance.md](references/performance.md) — WebGPU, quantization, per-module dtype, caching, memory. Read when optimizing performance or working with large models.
- [references/react-vite.md](references/react-vite.md) — Complete React + Vite integration with Web Worker. Read when building a Vite-based app.
- [references/nextjs.md](references/nextjs.md) — Next.js client-side and server-side patterns. Read when building a Next.js app.

## Installation

```bash
npm install @huggingface/transformers
```

## Quick Start

### Basic pipeline

```javascript
import { pipeline } from '@huggingface/transformers';

const classifier = await pipeline('sentiment-analysis');
const result = await classifier('I love this product!');
// [{ label: 'POSITIVE', score: 0.9998 }]
```

### Text generation with chat messages

```javascript
const generator = await pipeline('text-generation', 'onnx-community/Qwen2.5-0.5B-Instruct', {
  dtype: 'q4',
  device: 'webgpu',
});

const output = await generator([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Tell me a joke.' },
], { max_new_tokens: 128 });

console.log(output[0].generated_text.at(-1).content);
```

### Streaming with TextStreamer

```javascript
import { pipeline, TextStreamer } from '@huggingface/transformers';

const generator = await pipeline('text-generation', 'model-id', {
  dtype: 'q4', device: 'webgpu',
});

const streamer = new TextStreamer(generator.tokenizer, {
  skip_prompt: true,
  skip_special_tokens: true,
  callback_function(text) {
    process.stdout.write(text); // or update UI
  },
});

await generator(messages, { max_new_tokens: 256, streamer });
```

## Pipeline Creation Options

```javascript
const pipe = await pipeline(task, model, {
  device: 'webgpu',         // 'webgpu' | 'wasm' (default)
  dtype: 'q4',              // 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'
  progress_callback(info) { // Track model download
    // info: { status, file, progress, loaded, total }
    console.log(`${info.file}: ${(info.progress * 100).toFixed(1)}%`);
  },
});
```

### Quantization recommendations

| Environment | Recommended dtype | Notes |
|---|---|---|
| Desktop + WebGPU | `q4f16` or `fp16` | Best speed/quality balance |
| Desktop + WASM | `q8` | Default, good compromise |
| Mobile / low-end | `q4` | Smallest footprint |
| Max accuracy | `fp32` | Large, slow, highest fidelity |

## Singleton Pattern (Critical)

Never recreate pipelines — they download and initialize the model each time. Use a singleton:

```javascript
class PipelineSingleton {
  static task = 'sentiment-analysis';
  static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
  static instance = null;

  static async getInstance(progress_callback = null) {
    this.instance ??= pipeline(this.task, this.model, { progress_callback });
    return this.instance;
  }
}

// Always reuse:
const classifier = await PipelineSingleton.getInstance();
```

## Web Worker Pattern (Critical for Browser)

Always run inference in a Web Worker to avoid blocking the UI thread.

### worker.js

```javascript
import { pipeline } from '@huggingface/transformers';

let pipelineInstance = null;

async function getPipeline(progress_callback) {
  pipelineInstance ??= pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
    device: 'webgpu',
    dtype: 'q4',
    progress_callback,
  });
  return pipelineInstance;
}

self.addEventListener('message', async (e) => {
  const { type, data } = e.data;

  if (type === 'load') {
    await getPipeline((info) => self.postMessage({ type: 'progress', ...info }));
    self.postMessage({ type: 'ready' });
    return;
  }

  if (type === 'inference') {
    const pipe = await getPipeline();
    const result = await pipe(data.input);
    self.postMessage({ type: 'result', output: result });
  }
});
```

### Main thread

```javascript
const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

worker.postMessage({ type: 'load' });

worker.onmessage = (e) => {
  const { type } = e.data;
  if (type === 'progress') console.log(`${e.data.file}: ${(e.data.progress * 100).toFixed(1)}%`);
  if (type === 'ready') console.log('Model loaded');
  if (type === 'result') console.log('Output:', e.data.output);
};

// Run inference
worker.postMessage({ type: 'inference', data: { input: 'I love this!' } });
```

## Task Quick Reference

| Domain | Task | Example Model | Use Case |
|---|---|---|---|
| **NLP** | `text-generation` | `onnx-community/Qwen2.5-0.5B-Instruct` | Chat, completion |
| | `text-classification` | `Xenova/distilbert-base-uncased-finetuned-sst-2-english` | Sentiment, categories |
| | `token-classification` | `Xenova/bert-base-NER` | Named entity recognition |
| | `question-answering` | `Xenova/distilbert-base-cased-distilled-squad` | Extract answers from context |
| | `summarization` | `Xenova/distilbart-cnn-6-6` | Text condensation |
| | `translation` | `Xenova/nllb-200-distilled-600M` | Language translation |
| | `fill-mask` | `Xenova/bert-base-uncased` | Predict masked tokens |
| | `zero-shot-classification` | `Xenova/mobilebert-uncased-mnli` | Classify into arbitrary labels |
| | `feature-extraction` | `Xenova/all-MiniLM-L6-v2` | Text embeddings |
| **Vision** | `image-classification` | `Xenova/vit-base-patch16-224` | Label images |
| | `object-detection` | `Xenova/detr-resnet-50` | Detect & localize objects |
| | `image-segmentation` | `Xenova/detr-resnet-50-panoptic` | Pixel-level classification |
| | `depth-estimation` | `Xenova/depth-anything-small-hf` | Depth maps |
| | `background-removal` | `briaai/RMBG-1.4` | Remove backgrounds |
| **Audio** | `automatic-speech-recognition` | `onnx-community/whisper-tiny.en` | Transcription |
| | `text-to-speech` | `Xenova/speecht5_tts` | Generate speech |
| **Multi** | `image-to-text` | `Xenova/vit-gpt2-image-captioning` | Image captioning |
| | `zero-shot-image-classification` | `Xenova/clip-vit-base-patch32` | Classify images into any labels |
| | `document-question-answering` | `Xenova/donut-base-finetuned-docvqa` | Answer questions about documents |

See [references/pipelines.md](references/pipelines.md) for full input/output details per task.

## Bundler Configuration

### Vite

```javascript
// vite.config.js
export default defineConfig({
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

### Next.js

```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
    };
    return config;
  },
};
```

## WebGPU Detection & Fallback

```javascript
async function selectDevice() {
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) return 'webgpu';
    } catch {}
  }
  return 'wasm';
}

const device = await selectDevice();
const pipe = await pipeline('text-generation', 'model-id', { device, dtype: 'q4' });
```

## Common Pitfalls

1. **Missing `await`** — `pipeline()` and inference calls are async. Forgetting `await` returns a Promise, not results.
2. **No Web Worker** — Running inference on the main thread freezes the UI for seconds/minutes. Always use a Worker.
3. **Recreating pipelines** — Each `pipeline()` call downloads and initializes the model. Use the singleton pattern.
4. **Assuming WebGPU** — Not all browsers support it. Always feature-detect and fall back to `'wasm'`.
5. **Model too large** — Browser cache has quotas (~2-6 GB). Choose quantized models (`q4`, `q8`).
6. **Missing bundler config** — Vite tries to optimize `@huggingface/transformers` and fails. Exclude it from `optimizeDeps`.
7. **No progress feedback** — Large models take time to download. Always use `progress_callback` to show loading state.

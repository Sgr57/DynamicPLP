# Performance Optimization Reference

Deep-dive into WebGPU, quantization, caching, and memory management for Transformers.js in the browser.

## Table of Contents

- [WebGPU Acceleration](#webgpu-acceleration)
- [Quantization Guide](#quantization-guide)
- [Per-Module Dtype](#per-module-dtype)
- [Browser Model Caching](#browser-model-caching)
- [Progress Callbacks](#progress-callbacks)
- [Lazy Loading Strategies](#lazy-loading-strategies)
- [Memory Management](#memory-management)

---

## WebGPU Acceleration

### Feature detection

```javascript
async function isWebGPUAvailable() {
  if (!navigator.gpu) return false;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}
```

### Device selection with fallback

```javascript
const device = (await isWebGPUAvailable()) ? 'webgpu' : 'wasm';
const pipe = await pipeline('text-generation', 'model-id', { device });
```

### Browser support (as of 2025)

- **Chrome 113+**: Full support
- **Edge 113+**: Full support
- **Firefox**: Behind `dom.webgpu.enabled` flag
- **Safari**: Behind feature flag in Technology Preview
- **Mobile Chrome**: Partial support on Android

### Known limitations

- Not all ONNX operators have WebGPU kernels — some ops fall back to CPU
- First inference is slower (shader compilation). Subsequent calls are faster.
- Some models may produce different numerical results on WebGPU vs WASM (float precision)
- WebGPU memory is separate from system RAM — check GPU VRAM limits

---

## Quantization Guide

### Available dtypes

| dtype | Bits | Size reduction | Quality | Best for |
|---|---|---|---|---|
| `fp32` | 32 | Baseline | Highest | Max accuracy, debugging |
| `fp16` | 16 | ~50% | Very good | WebGPU default, balanced |
| `q8` / `int8` / `uint8` | 8 | ~75% | Good | WASM default, general use |
| `q4` | 4 | ~87% | Acceptable | Mobile, bandwidth-constrained |
| `q4f16` | 4 (float16 scale) | ~87% | Good | WebGPU + small footprint |
| `bnb4` | 4 (bitsandbytes) | ~87% | Good | Specific model support |

### Choosing the right dtype

```
Is WebGPU available?
├── Yes → Is model large (>1B params)?
│   ├── Yes → q4f16 (small + fast on GPU)
│   └── No → fp16 (quality + speed)
└── No (WASM) → Is device constrained?
    ├── Yes → q4 (smallest)
    └── No → q8 (balanced)
```

### Dynamic dtype selection

```javascript
import { ModelRegistry } from '@huggingface/transformers';

async function selectDtype(modelId, device) {
  const available = await ModelRegistry.get_available_dtypes(modelId);

  const preference = device === 'webgpu'
    ? ['q4f16', 'fp16', 'q4', 'q8', 'fp32']
    : ['q4', 'q8', 'fp16', 'fp32'];

  return preference.find(d => available.includes(d)) ?? 'fp32';
}
```

---

## Per-Module Dtype

Encoder-decoder models (Whisper, Florence-2, T5, BART) have multiple submodules. Quantize each independently for optimal size/quality:

### Pattern

```javascript
const model = await ModelClass.from_pretrained(modelId, {
  dtype: {
    embed_tokens: 'fp16',       // Embedding layer — sensitive to quantization
    vision_encoder: 'fp16',     // Vision encoder — sensitive
    encoder_model: 'q4',        // Text encoder — can tolerate quantization
    decoder_model_merged: 'q4', // Decoder — can tolerate quantization
  },
  device: 'webgpu',
});
```

### Common configurations

**Whisper (ASR)**:
```javascript
{ dtype: { encoder_model: 'fp16', decoder_model_merged: 'q4' } }
```

**Florence-2 (Vision-Language)**:
```javascript
{
  dtype: {
    embed_tokens: 'fp16',
    vision_encoder: 'fp16',
    encoder_model: 'q4',
    decoder_model_merged: 'q4',
  },
}
```

**T5/BART (Seq2Seq)**:
```javascript
{ dtype: { encoder_model: 'q8', decoder_model_merged: 'q4' } }
```

---

## Browser Model Caching

### How it works

- Models are cached automatically in the browser's Cache API on first download
- Subsequent loads hit the cache (no network request)
- Cache persists across browser sessions until cleared by user or quota exceeded

### Cache quotas

- Chrome: ~80% of available disk space (varies by device)
- Firefox: ~50% of disk or 10GB max per origin
- Safari: ~1GB per origin (more restrictive)
- Mobile: typically much lower limits

### Cache management

```javascript
// Check if model is cached (via Cache API)
const cache = await caches.open('transformers-cache');
const keys = await cache.keys();
const cached = keys.some(req => req.url.includes('model-name'));

// Clear all cached models
await caches.delete('transformers-cache');
```

### Preloading models

Trigger model download before the user needs it:

```javascript
// Preload in a Web Worker on app startup
worker.postMessage({ type: 'load' });

// Worker handles download with progress tracking
// User sees loading indicator, model ready when needed
```

---

## Progress Callbacks

### Callback signature

```javascript
function progress_callback(info) {
  // info structure varies by status:
  // Download initiate: { status: 'initiate', name: 'model.onnx', file: 'onnx/model.onnx' }
  // Download progress: { status: 'progress', name: '...', file: '...', progress: 0.45, loaded: 1024, total: 2048 }
  // Download done:     { status: 'done', name: '...', file: '...' }
  // Model ready:       { status: 'ready' }
}
```

### Forwarding through Web Worker

```javascript
// worker.js
const pipe = await pipeline('task', 'model', {
  progress_callback(info) {
    self.postMessage({ type: 'progress', ...info });
  },
});
self.postMessage({ type: 'ready' });

// main.js
worker.onmessage = (e) => {
  if (e.data.type === 'progress') {
    const { file, progress } = e.data;
    updateProgressBar(file, progress);
  }
};
```

### Tracking multiple files

Models consist of multiple files. Track each file independently:

```javascript
const fileProgress = {};

function onProgress(info) {
  if (info.status === 'progress') {
    fileProgress[info.file] = info.progress;
    const overall = Object.values(fileProgress).reduce((a, b) => a + b, 0) / Object.keys(fileProgress).length;
    updateUI(overall);
  }
}
```

---

## Lazy Loading Strategies

### Load on first use

```javascript
class LazyPipeline {
  static instance = null;

  static async get() {
    if (!this.instance) {
      this.instance = pipeline('task', 'model', { device: 'webgpu', dtype: 'q4' });
    }
    return this.instance;
  }
}

// Model only downloads when first inference is requested
async function classify(text) {
  const pipe = await LazyPipeline.get();
  return pipe(text);
}
```

### Preload on idle

```javascript
// Preload when browser is idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    LazyPipeline.get(); // Start download in background
  });
}
```

### Preload on route

```javascript
// React: preload when component mounts (before user interaction)
useEffect(() => {
  worker.current.postMessage({ type: 'load' });
}, []);
```

---

## Memory Management

### Dispose pipelines when no longer needed

```javascript
// If switching models or cleaning up
if (pipelineInstance) {
  await pipelineInstance.dispose?.();
  pipelineInstance = null;
}
```

### Terminate workers

```javascript
// Clean up worker when component unmounts
useEffect(() => {
  const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.current = w;
  return () => w.terminate();
}, []);
```

### Avoid loading multiple large models simultaneously

```javascript
// BAD: loading 3 models at once exhausts memory
const [a, b, c] = await Promise.all([
  pipeline('text-generation', 'large-model-1'),
  pipeline('image-classification', 'large-model-2'),
  pipeline('speech-recognition', 'large-model-3'),
]);

// GOOD: load sequentially, dispose when switching
let current = await pipeline('text-generation', 'large-model-1');
// ... use it ...
await current.dispose?.();
current = await pipeline('image-classification', 'large-model-2');
```

### Monitor memory

```javascript
// Check JS heap (approximate)
if (performance.memory) {
  const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
  const usage = usedJSHeapSize / jsHeapSizeLimit;
  if (usage > 0.8) console.warn('High memory usage:', (usage * 100).toFixed(1) + '%');
}
```

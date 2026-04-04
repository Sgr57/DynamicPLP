# React + Vite Integration

Complete pattern for using Transformers.js in a React app with Vite, including Web Worker, progress tracking, and streaming.

## Table of Contents

- [Vite Configuration](#vite-configuration)
- [Web Worker (worker.js)](#web-worker)
- [React Hook](#react-hook)
- [Complete Example: Sentiment Analysis](#complete-example)
- [Streaming Text Generation](#streaming-text-generation)

---

## Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (used by some ONNX Runtime features)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
```

---

## Web Worker

### worker.js — Singleton + message protocol

```javascript
import { pipeline, TextStreamer } from '@huggingface/transformers';

let instance = null;

async function getPipeline(task, model, options = {}) {
  if (!instance) {
    instance = await pipeline(task, model, {
      device: 'webgpu',
      dtype: 'q4',
      progress_callback(info) {
        self.postMessage({ type: 'progress', ...info });
      },
      ...options,
    });
    self.postMessage({ type: 'ready' });
  }
  return instance;
}

self.addEventListener('message', async (e) => {
  const { type, data } = e.data;

  try {
    if (type === 'load') {
      await getPipeline(data.task, data.model, data.options);
      return;
    }

    if (type === 'inference') {
      const pipe = await getPipeline(data.task, data.model);
      const result = await pipe(data.input, data.options);
      self.postMessage({ type: 'result', output: result });
      return;
    }

    if (type === 'generate') {
      const pipe = await getPipeline(data.task, data.model);
      const streamer = new TextStreamer(pipe.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function(token) {
          self.postMessage({ type: 'token', output: token });
        },
      });
      const result = await pipe(data.input, { ...data.options, streamer });
      self.postMessage({ type: 'result', output: result });
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
});
```

---

## React Hook

### useTransformers.js

```javascript
import { useEffect, useRef, useState, useCallback } from 'react';

export function useTransformers(task, model, options = {}) {
  const workerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type } = e.data;
      if (type === 'progress') {
        setProgress(prev => ({ ...prev, [e.data.file]: e.data.progress }));
      }
      if (type === 'ready') {
        setReady(true);
        setLoading(false);
      }
      if (type === 'error') {
        setError(e.data.message);
        setLoading(false);
      }
    };

    // Preload model
    setLoading(true);
    worker.postMessage({ type: 'load', data: { task, model, options } });

    return () => worker.terminate();
  }, [task, model]);

  const run = useCallback((input, inferenceOptions = {}) => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) return reject(new Error('Worker not initialized'));

      const handler = (e) => {
        if (e.data.type === 'result') {
          worker.removeEventListener('message', handler);
          resolve(e.data.output);
        }
        if (e.data.type === 'error') {
          worker.removeEventListener('message', handler);
          reject(new Error(e.data.message));
        }
      };
      worker.addEventListener('message', handler);
      worker.postMessage({ type: 'inference', data: { task, model, input, options: inferenceOptions } });
    });
  }, [task, model]);

  const overallProgress = Object.keys(progress).length > 0
    ? Object.values(progress).reduce((a, b) => a + b, 0) / Object.keys(progress).length
    : 0;

  return { run, ready, loading, progress: overallProgress, error };
}
```

---

## Complete Example

### Sentiment Analysis Component

```jsx
import { useState } from 'react';
import { useTransformers } from './useTransformers';

export function SentimentAnalyzer() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const { run, ready, loading, progress } = useTransformers(
    'sentiment-analysis',
    'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  );

  const analyze = async () => {
    if (!text.trim()) return;
    const output = await run(text);
    setResult(output[0]);
  };

  return (
    <div>
      {loading && <p>Loading model... {(progress * 100).toFixed(0)}%</p>}

      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={!ready} />
      <button onClick={analyze} disabled={!ready}>Analyze</button>

      {result && (
        <p>
          {result.label} ({(result.score * 100).toFixed(1)}%)
        </p>
      )}
    </div>
  );
}
```

---

## Streaming Text Generation

### Worker message handler (add to worker.js)

The `generate` message type in the worker above already handles streaming via `TextStreamer`.

### React component with streaming

```jsx
import { useEffect, useRef, useState, useCallback } from 'react';

export function ChatGenerator() {
  const workerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === 'ready') setReady(true);
      if (e.data.type === 'token') setOutput(prev => prev + e.data.output);
      if (e.data.type === 'result') setGenerating(false);
    };

    worker.postMessage({
      type: 'load',
      data: { task: 'text-generation', model: 'onnx-community/Qwen2.5-0.5B-Instruct' },
    });

    return () => worker.terminate();
  }, []);

  const generate = useCallback((messages) => {
    setOutput('');
    setGenerating(true);
    workerRef.current.postMessage({
      type: 'generate',
      data: {
        task: 'text-generation',
        model: 'onnx-community/Qwen2.5-0.5B-Instruct',
        input: messages,
        options: { max_new_tokens: 256, temperature: 0.7 },
      },
    });
  }, []);

  return (
    <div>
      <button
        onClick={() => generate([
          { role: 'user', content: 'Tell me a short story' },
        ])}
        disabled={!ready || generating}
      >
        Generate
      </button>
      <pre>{output}</pre>
    </div>
  );
}
```

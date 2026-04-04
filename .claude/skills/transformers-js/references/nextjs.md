# Next.js Integration

Patterns for using Transformers.js in Next.js: client-side with Web Workers and server-side with Route Handlers.

## Table of Contents

- [Next.js Configuration](#nextjs-configuration)
- [Client-Side Pattern (Web Worker)](#client-side-pattern)
- [Server-Side Pattern (Route Handler)](#server-side-pattern)
- [Static Export](#static-export)

---

## Next.js Configuration

### Client-side (static export)

```javascript
// next.config.js
const nextConfig = {
  output: 'export', // Static export for client-only
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
    };
    return config;
  },
};

module.exports = nextConfig;
```

### Server-side (with API routes)

```javascript
// next.config.js
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
  },
};

module.exports = nextConfig;
```

---

## Client-Side Pattern

### worker.js

```javascript
import { pipeline } from '@huggingface/transformers';

let instance = null;

async function getPipeline(progress_callback) {
  if (!instance) {
    instance = await pipeline(
      'text-classification',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
      { progress_callback },
    );
  }
  return instance;
}

self.addEventListener('message', async (event) => {
  const classifier = await getPipeline((info) => self.postMessage(info));
  const output = await classifier(event.data.text);
  self.postMessage({ status: 'complete', output });
});
```

### Client component

```jsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function ClassifierPage() {
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(null);
  const worker = useRef(null);

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });
    }

    const onMessage = (e) => {
      switch (e.data.status) {
        case 'initiate':
          setReady(false);
          break;
        case 'ready':
          setReady(true);
          break;
        case 'complete':
          setResult(e.data.output[0]);
          break;
      }
    };

    worker.current.addEventListener('message', onMessage);
    return () => worker.current.removeEventListener('message', onMessage);
  });

  const classify = useCallback((text) => {
    if (worker.current) {
      worker.current.postMessage({ text });
    }
  }, []);

  return (
    <div>
      <input onChange={(e) => classify(e.target.value)} placeholder="Type to classify..." />
      {ready !== null && (
        <pre>{!ready || !result ? 'Loading...' : JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
```

---

## Server-Side Pattern

### Pipeline singleton (survives HMR)

```javascript
// app/api/classify/pipeline.js
import { pipeline } from '@huggingface/transformers';

function createSingleton() {
  return class PipelineSingleton {
    static task = 'text-classification';
    static model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
    static instance = null;

    static async getInstance(progress_callback = null) {
      if (this.instance === null) {
        this.instance = pipeline(this.task, this.model, { progress_callback });
      }
      return this.instance;
    }
  };
}

// In dev mode, store on globalThis to survive HMR reloads
let PipelineSingleton;
if (process.env.NODE_ENV !== 'production') {
  globalThis.PipelineSingleton ??= createSingleton();
  PipelineSingleton = globalThis.PipelineSingleton;
} else {
  PipelineSingleton = createSingleton();
}

export default PipelineSingleton;
```

### Route handler

```javascript
// app/api/classify/route.js
import { NextResponse } from 'next/server';
import PipelineSingleton from './pipeline.js';

export async function GET(request) {
  const text = request.nextUrl.searchParams.get('text');
  if (!text) {
    return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
  }

  const classifier = await PipelineSingleton.getInstance();
  const result = await classifier(text);

  return NextResponse.json(result);
}
```

### Client component (calling API)

```jsx
'use client';

import { useState } from 'react';

export default function ClassifierPage() {
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(null);

  const classify = async (text) => {
    if (!text) return;
    if (ready === null) setReady(false);

    const response = await fetch(`/api/classify?text=${encodeURIComponent(text)}`);
    if (!ready) setReady(true);

    const json = await response.json();
    setResult(json);
  };

  return (
    <div>
      <input onChange={(e) => classify(e.target.value)} placeholder="Type to classify..." />
      {ready !== null && (
        <pre>{!ready || !result ? 'Loading...' : JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}
```

---

## Static Export

When using `output: 'export'` for fully client-side apps:

- Models load at runtime from Hugging Face Hub (not bundled at build time)
- No server-side code executes — all inference happens in the browser
- Web Workers work normally with `new URL('./worker.js', import.meta.url)`
- Ensure `sharp$: false` and `onnxruntime-node$: false` aliases are set to avoid Node.js-only imports
- Deploy to any static hosting (Vercel, Netlify, GitHub Pages, S3)

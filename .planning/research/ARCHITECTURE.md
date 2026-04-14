# Architecture Patterns

**Domain:** Model selection/settings feature for browser-based AI inference engine
**Researched:** 2026-04-14

## Current Architecture (Baseline)

The existing inference pipeline is a linear chain with hard-coded model selection:

```
modelConfig.js (static ACTIVE_MODEL) 
  --> modelAdapter.js (factory, creates TransformersJsAdapter)
    --> modelWorker.js (Web Worker, holds adapter instance)
      --> useModelLoader.js (React hook, manages worker lifecycle)
        --> useReranker.js (orchestrator, calls generate())
```

Key observations about the current design:

1. **`modelConfig.js` is the single source of truth** -- `MODELS` dict + `ACTIVE_MODEL` string, merged into `MODEL_CONFIG` export. Worker imports this at creation time and never re-reads it.
2. **`modelAdapter.js` is a factory** -- `createModelAdapter()` dynamically imports the adapter class and instantiates it. Already structured for multi-backend support (TransformersJs + WebLLM adapters exist).
3. **`modelWorker.js` holds a singleton adapter** -- `let adapter = null`. Worker supports `load`, `generate`, `abort`, `dispose` messages. No `swap` or `reload` message exists.
4. **`useModelLoader` creates the worker once on mount** -- the `useEffect` dependency array is `[]` (empty). Worker is terminated on unmount. No mechanism to restart with different config.
5. **`useReranker` receives `generate` as a prop** -- completely decoupled from model identity. It does not care which model produces the output.

## Recommended Architecture for Model Selection

### Design Principle: Terminate-and-Recreate, Not Hot-Swap

**Do not attempt to dispose a model and load another in the same Web Worker.** This is the central architectural decision.

**Why:** Research into Transformers.js memory management confirms that `model.dispose()` and `pipeline.dispose()` do not reliably reclaim GPU memory in WebGPU mode. GitHub issues [#860](https://github.com/huggingface/transformers.js/issues/860) and [#836](https://github.com/huggingface/transformers.js/issues/836) document that memory is only fully reclaimed when the worker is terminated. The CompareLocalLLM reference project (`workerBridge.ts:62`, `workerBridge.ts:320`) confirms this pattern -- it terminates and recreates the worker between model runs explicitly for this reason.

**The pattern:** When the user selects a new model, terminate the current worker entirely. Create a fresh worker. Send it the new model config. This guarantees clean GPU memory state.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **`modelConfig.js`** (refactored) | Model registry (all available models), default selection, inference params. Exported as `MODELS` dict. No longer exports a single `MODEL_CONFIG`. | Read by `modelSettingsRepo`, `SettingsPage`, `modelWorker` |
| **`modelSettingsRepo.js`** (new) | Persists user's model selection + inference params in TinyBase `aiMemory`. Single source of truth for "which model is active." | Reads/writes TinyBase. Read by `useModelLoader`, `SettingsPage` |
| **`modelWorker.js`** (refactored) | Accepts model config via `load` message (not import). Holds adapter instance. Same message types plus new `load` payload shape. | Receives messages from `useModelLoader` |
| **`modelAdapter.js`** (refactored) | Factory now accepts config parameter: `createModelAdapter(config)`. No longer imports `MODEL_CONFIG` directly. | Called by `modelWorker` |
| **`useModelLoader.js`** (refactored) | Manages worker lifecycle. Exposes `switchModel(modelKey)` that terminates current worker + creates new one. Dependency on `activeModelKey` triggers reload. | Talks to `modelWorker`, read by `App.jsx`, consumes `modelSettingsRepo` |
| **`SettingsPage.jsx`** (new) | Hidden settings UI. Model picker, inference param sliders, cache status display. Writes to `modelSettingsRepo`. | Reads `modelConfig.js` registry, writes `modelSettingsRepo`, reads Cache API for cache status |
| **`useReranker.js`** | No changes needed. Already receives `generate` as a prop. Completely model-agnostic. | Unchanged |

### Data Flow

```
User selects model in SettingsPage
  |
  v
modelSettingsRepo.setActiveModel('qwen3-0.6b')
  --> writes to TinyBase aiMemory: { key: 'active_model', value: 'qwen3-0.6b' }
  --> writes to TinyBase aiMemory: { key: 'model_params', value: { temperature, top_p, max_tokens } }
  |
  v
useModelLoader reads activeModelKey from modelSettingsRepo
  --> activeModelKey changed? 
    --> YES: terminate current worker
    --> create new Worker(modelWorker.js)
    --> postMessage({ type: 'load', config: MODELS[activeModelKey] })
    --> set status: 'loading'
  |
  v
modelWorker receives { type: 'load', config }
  --> createModelAdapter(config) -- factory resolves correct adapter class
  --> adapter.load(onProgress) -- downloads/loads model
  --> postMessage({ type: 'ready' })
  |
  v
useModelLoader sets status: 'ready'
  --> App passes generate to useReranker (unchanged)
  --> inference pipeline continues as before
```

### Settings Page Access Pattern

The settings page should be a hidden route, accessible via a keyboard shortcut or footer link (not main navigation). Two approaches:

**Recommended: Conditional render in App.jsx (no router needed)**

```jsx
// App.jsx
const [showSettings, setShowSettings] = useState(false)

// Keyboard shortcut: Ctrl+Shift+S or Cmd+Shift+S
useEffect(() => {
  const handler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault()
      setShowSettings(prev => !prev)
    }
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [])

// Render either SettingsPage or main PLP
if (showSettings) return <SettingsPage onBack={() => setShowSettings(false)} />
```

**Rationale:** Adding react-router for a single hidden page is unnecessary overhead for a PoC. The app has no routing today. A boolean toggle is simpler and keeps the bundle smaller.

## Patterns to Follow

### Pattern 1: Config-as-Message (Worker Parameterization)

**What:** Pass model configuration to the worker via the `load` message rather than having the worker import it statically.

**When:** Always -- this is the prerequisite for model switching.

**Current (static import):**
```js
// modelWorker.js -- current
import { createModelAdapter } from './modelAdapter'

self.addEventListener('message', async (e) => {
  if (type === 'load') {
    adapter = await createModelAdapter() // reads MODEL_CONFIG internally
  }
})
```

**Target (config-as-message):**
```js
// modelWorker.js -- target
import { createModelAdapter } from './modelAdapter'

self.addEventListener('message', async (e) => {
  if (type === 'load') {
    adapter = await createModelAdapter(data.config) // config passed in message
  }
})
```

### Pattern 2: Terminate-and-Recreate for Model Switching

**What:** When switching models, terminate the current Web Worker entirely and create a new one. Do not try to dispose+reload in the same worker.

**When:** Every time the active model changes.

**Why:** WebGPU memory is not reliably freed by `dispose()` alone. The ONNX Runtime WebGPU session retains GPU allocations until the execution context (worker) is destroyed. CompareLocalLLM validates this pattern in production.

```js
// useModelLoader.js -- switchModel flow
function switchModel(newModelKey) {
  // 1. Reject pending promises
  for (const { reject } of Object.values(pendingRef.current)) {
    reject(new Error('Model switching'))
  }
  pendingRef.current = {}

  // 2. Terminate old worker (frees GPU memory)
  workerRef.current?.terminate()
  workerRef.current = null

  // 3. Small delay for GPU driver cleanup (50ms, per CompareLocalLLM pattern)
  // 4. Create fresh worker with new config
  const worker = new Worker(new URL('../lib/modelWorker.js', import.meta.url), { type: 'module' })
  workerRef.current = worker
  worker.postMessage({ type: 'load', config: resolvedConfig })
}
```

### Pattern 3: Persistence via TinyBase (Not localStorage)

**What:** Store model selection in TinyBase `aiMemory` table, not localStorage or a separate store.

**When:** For all user preferences related to model selection and inference parameters.

**Why:** The app already has TinyBase with IndexedDB auto-persistence. Adding Zustand or localStorage creates a second persistence layer. TinyBase keeps everything in one place. The `aiMemoryRepo` already has `getMemoryValue`/`setMemoryValue` -- model settings fit naturally.

```js
// modelSettingsRepo.js
import { getMemoryValue, setMemoryValue } from './aiMemoryRepo'
import { MODELS, DEFAULT_MODEL_KEY } from '../data/modelConfig'

export function getActiveModelKey() {
  return getMemoryValue('active_model') || DEFAULT_MODEL_KEY
}

export function setActiveModelKey(key) {
  if (!MODELS[key]) throw new Error(`Unknown model: ${key}`)
  setMemoryValue('active_model', key)
}

export function getInferenceParams() {
  return getMemoryValue('inference_params') || {
    temperature: 0.3, top_p: 0.9, max_tokens: 200,
  }
}

export function setInferenceParams(params) {
  setMemoryValue('inference_params', params)
}
```

### Pattern 4: Model Registry as Pure Data

**What:** `modelConfig.js` becomes a pure registry of available models. No active selection logic.

**When:** Replaces current `ACTIVE_MODEL` + spread pattern.

```js
// modelConfig.js -- target shape
export const MODELS = {
  'gemma4-e2b': {
    model: 'onnx-community/gemma-4-E2B-it-ONNX',
    dtype: 'q4f16',
    device: 'webgpu',
    label: 'Gemma 4 E2B',
    backend: 'transformersJs',
  },
  'qwen3-0.6b': {
    model: 'onnx-community/Qwen3-0.6B-ONNX',
    dtype: 'q4f16',
    device: 'webgpu',
    label: 'Qwen3 0.6B',
    backend: 'transformersJs',
    enableThinking: false,
  },
  // Future: custom fine-tuned model entries
}

export const DEFAULT_MODEL_KEY = 'gemma4-e2b'

export const DEFAULT_INFERENCE_PARAMS = {
  temperature: 0.3,
  top_p: 0.9,
  max_tokens: 200,
  inferenceTimeout: 30000,
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: In-Worker Model Swap via Dispose+Load

**What:** Adding a `swap` message to the worker that calls `adapter.dispose()` then loads a new model.

**Why bad:** WebGPU memory leaks. The ONNX Runtime's WebGPU session may not release GPU buffers on dispose. After 2-3 swaps, the GPU runs out of memory and the device is lost. This is documented in Transformers.js issues and confirmed by the CompareLocalLLM codebase which explicitly avoids it.

**Instead:** Terminate the worker entirely and create a fresh one (Pattern 2).

### Anti-Pattern 2: Storing Model Selection in React State Only

**What:** Keeping `activeModel` in `useState` without persisting.

**Why bad:** User selects a model, refreshes the page, loses selection. The pre-personalized startup feature (`last_weights`) already demonstrates why persistence matters -- the same principle applies to model choice.

**Instead:** Persist in TinyBase via `modelSettingsRepo` (Pattern 3).

### Anti-Pattern 3: Adding a Router for One Page

**What:** Installing react-router-dom just for the settings page.

**Why bad:** Adds ~15KB to the bundle for a single hidden route in a PoC. The settings page will be accessed via keyboard shortcut or hidden link, not URL navigation.

**Instead:** Simple boolean toggle in App.jsx (see Settings Page Access Pattern above).

### Anti-Pattern 4: Dynamic HuggingFace Search in Settings

**What:** Building a full HuggingFace model search like CompareLocalLLM's ModelSelector.

**Why bad:** Scope creep. CompareLocalLLM is a model comparison tool -- search is its core feature. DynamicPLP is a PLP demo. Users need to pick from a curated list of known-good models that work with the prompt format. Arbitrary models will produce unparseable output.

**Instead:** Curated model list in `modelConfig.js`. Allow custom model ID input as an advanced option, but display a warning that custom models may not produce parseable output.

### Anti-Pattern 5: Separate Generation Params Per Model

**What:** Storing temperature/top_p/max_tokens per model entry.

**Why bad:** Over-engineers the PoC. The inference params are about user preference, not model-specific tuning. A single set of params is simpler and sufficient for a demo.

**Instead:** One set of inference params in `modelSettingsRepo`, applied to whichever model is active.

## Scalability Considerations

| Concern | Current (1 model) | Target (2-5 models) | Future (user-added models) |
|---------|-------------------|---------------------|---------------------------|
| Model registry | Static JS object | Static JS object with more entries | Same object + custom entries persisted in TinyBase |
| Cache management | Implicit (browser Cache API) | Show cache status per model in settings | Add delete-cached-model button (borrow from CompareLocalLLM `cacheManager.ts`) |
| GPU memory | Single model loaded | Only one model loaded at a time (terminate-and-recreate) | Same -- browser can only hold one large model in GPU |
| Download UX | ModelLoader component | Same component, different model label | Add download progress per model in settings |
| Prompt compatibility | Hardcoded for Gemma/Qwen | Works if models follow chat template | May need model-specific prompt tweaks -- flag for future |

## Suggested Build Order (Dependencies)

The build order matters because each layer depends on the one before it:

### Step 1: Refactor modelConfig.js (no behavioral change)
Split `MODEL_CONFIG` into `MODELS` registry + `DEFAULT_MODEL_KEY` + `DEFAULT_INFERENCE_PARAMS`. All consumers still use the default. Zero risk.

### Step 2: Parameterize modelAdapter.js and modelWorker.js
Make `createModelAdapter(config)` accept config as argument. Make worker accept config in `load` message. Pass current default config. Behavior is identical but the static coupling is broken.

### Step 3: Create modelSettingsRepo.js
New file using existing `aiMemoryRepo` primitives. `getActiveModelKey()`, `setActiveModelKey()`, `getInferenceParams()`, `setInferenceParams()`. Returns defaults if nothing persisted.

### Step 4: Refactor useModelLoader to support model switching
Read `activeModelKey` from `modelSettingsRepo`. Add `switchModel()` that terminates worker + creates new one. The `useEffect` dependency becomes `[activeModelKey]` instead of `[]`. This is the core behavioral change.

### Step 5: Build SettingsPage UI
Model selector (dropdown/radio from MODELS registry), inference param sliders, cache status display. Writes to `modelSettingsRepo`. Hidden behind keyboard shortcut.

### Step 6: Wire into App.jsx
Add settings toggle state, keyboard shortcut listener, conditional render of SettingsPage vs main PLP. Update ModelLoader to show the active model's label dynamically.

**Why this order:** Steps 1-2 are pure refactors with no behavioral change (safe). Step 3 adds persistence without UI (testable in isolation). Step 4 is the critical behavioral change (model switching). Step 5 is the UI. Step 6 is integration. Each step can be verified independently.

## Sources

- [Transformers.js memory leak issue #860](https://github.com/huggingface/transformers.js/issues/860) -- GPU memory not freed by dispose
- [Transformers.js memory issue #836](https://github.com/huggingface/transformers.js/issues/836) -- memory only reclaimed on worker termination
- [Transformers.js v4 release](https://huggingface.co/blog/transformersjs-v4) -- current version capabilities
- CompareLocalLLM `workerBridge.ts` (local reference) -- terminate-and-recreate pattern at lines 62, 320
- CompareLocalLLM `inference.worker.ts` (local reference) -- 50ms GPU cleanup delay between models
- CompareLocalLLM `cacheManager.ts` (local reference) -- cache enumeration and deletion patterns
- [web.dev client-side AI stack](https://web.dev/learn/ai/client-side) -- browser model lifecycle overview
- [Transformers.js WebGPU guide](https://huggingface.co/docs/transformers.js/guides/webgpu) -- device detection, backend configuration

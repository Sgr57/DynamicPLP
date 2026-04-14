# Technology Stack

**Project:** DynamicPLP -- LLM Settings Page & Stabilization
**Researched:** 2026-04-14

## Existing Stack (Keep As-Is)

These are already in the project and working. No changes recommended.

| Technology | Version | Purpose | Notes |
|------------|---------|---------|-------|
| React | 18.3.x | UI framework | Stable, no reason to upgrade for a PoC |
| Vite | 5.4.x | Build tool | Working fine with current config |
| Tailwind CSS | 3.4.x | Styling | Consistent with existing UI |
| Framer Motion | 11.x | Layout animations | Used for grid reordering |
| TinyBase | 5.x | Reactive store + IndexedDB persistence | Core data layer, well-integrated |
| Workbox | 7.x | Service Worker / PWA | Offline capability |
| lodash | 4.17.x | Utility functions | Already a dependency |

## New Stack Additions

### Chat Template Fix (Critical -- Fixes Existing Regression)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| N/A -- code fix in adapter | N/A | Fix `apply_chat_template` error for Gemma 4 | See "Chat Template Fix Strategy" below |

**Confidence: HIGH** -- Verified by reading transformers.js v4.0.1 source code.

#### Root Cause Analysis

The `apply_chat_template` error is caused by a known incompatibility between Gemma 4 models and transformers.js:

1. **Gemma 4 ONNX models** (e.g., `onnx-community/gemma-4-E2B-it-ONNX`) ship the chat template as a **separate `chat_template.jinja` file** (16.3 KB) and do NOT include it in `tokenizer_config.json`.
2. **Transformers.js v4.0.1** only reads `chat_template` from `tokenizerConfig.chat_template` (line 209 of `tokenization_utils.js`). It does **not** auto-load `chat_template.jinja`.
3. When `this.chat_template` is null, `apply_chat_template()` throws: "Cannot use apply_chat_template() because tokenizer.chat_template is not set."

This is a **known upstream issue** reported as [huggingface/transformers#45205](https://github.com/huggingface/transformers/issues/45205). Multiple HF projects (TGI, swift-transformers) are affected.

#### Chat Template Fix Strategy

**Option A (Recommended): Fetch and inject the chat_template.jinja at load time**

After loading the tokenizer in `TransformersJsAdapter.load()`, check if `this.tokenizer.chat_template` is null. If so, fetch `chat_template.jinja` from the model repo and assign it:

```javascript
// In TransformersJsAdapter.load(), after tokenizer load:
if (!this.tokenizer.chat_template) {
  const url = `https://huggingface.co/${this.modelId}/resolve/main/chat_template.jinja`
  const res = await fetch(url)
  if (res.ok) {
    this.tokenizer.chat_template = await res.text()
  }
}
```

This is the same pattern used by the Python workaround in the upstream issue. The fetched template gets cached by the browser's HTTP cache on subsequent loads.

**Option B: Pass template string directly to apply_chat_template**

The `apply_chat_template` method accepts a `chat_template` option parameter. You could hard-code or bundle known templates per model. This is brittle and doesn't scale to arbitrary models.

**Option C: Use `pipeline('text-generation')` instead of manual tokenizer + model**

The pipeline API (used in the CompareLocalLLM reference project) handles chat formatting internally. However, the current codebase uses the manual `AutoTokenizer` + `AutoModelForCausalLM` approach for more control over generation. Switching would require reworking the adapter.

**Recommendation: Option A.** Minimal code change (5-10 lines), solves the root cause, works for any model with a `chat_template.jinja`, and is forward-compatible with a future transformers.js fix.

### Model Switching Support

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| N/A -- architecture change | N/A | Model config becomes dynamic, not static import | Enables runtime model selection |
| HuggingFace Hub API | REST API | Search/discover ONNX models | Same pattern used in CompareLocalLLM reference project |
| Browser Cache API | Built-in | Check if model is already cached | Avoids re-downloading; pattern from CompareLocalLLM |

**Confidence: HIGH** -- Patterns verified in the user's own CompareLocalLLM project.

#### Model Switching Architecture

The current codebase already has a good adapter pattern (`TransformersJsAdapter`), but model selection is hardcoded in `modelConfig.js`. Changes needed:

1. **Make `MODEL_CONFIG` dynamic**: Store active model config in TinyBase `aiMemory` table instead of a static JS export. On startup, read from TinyBase; fall back to a default.

2. **Worker lifecycle for model swap**: The worker currently loads one model and never disposes it. For model switching:
   - Send `dispose` to worker
   - Wait for `disposed` response
   - Terminate worker
   - Start new worker with new model config
   - The `useModelLoader` hook already handles worker lifecycle with retries

3. **Chat template compatibility per model**: Different models have different chat template situations:
   - **Qwen3-0.6B-ONNX**: chat_template embedded in `tokenizer_config.json` -- works out of the box
   - **Gemma 4 E2B ONNX**: chat_template in separate `.jinja` file -- needs the fetch-and-inject fix
   - **SmolLM2 variants**: typically embed in `tokenizer_config.json` -- works out of the box
   - **LFM2 series**: chat_template in separate `.jinja` file -- needs the fetch-and-inject fix

   The fix from Option A above handles all cases transparently.

### Settings Page UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| No router needed | N/A | Hidden settings panel | A hash-based show/hide or keyboard shortcut is simpler than adding a router to a single-page PoC |

**Confidence: HIGH** -- Architectural decision, not library choice.

#### Why No Router

The current app has zero routing. Adding `react-router-dom` for a single hidden settings page adds unnecessary complexity to a PoC:

- **Current app**: Single SPA, no routes, no URL state
- **Settings page**: Hidden/power-user feature, not end-user navigation
- **PWA/offline**: Router adds edge cases with service worker caching

**Instead, use one of:**

1. **URL hash trigger**: Navigate to `#/settings` to show settings overlay/panel. Listen for `hashchange` event. No library needed. This is the simplest approach.
2. **Keyboard shortcut**: Ctrl+Shift+S (or similar) toggles a settings panel. Zero URL impact.
3. **Hidden click target**: Triple-click on header title or long-press, common in demo apps.

**Recommendation**: URL hash trigger (`#/settings`). It's bookmarkable, sharable, and requires zero dependencies. The settings page renders as a full-screen overlay or slides in like the existing ProductDrawer.

### Curated Model List

| Data | Source | Purpose | Why |
|------|--------|---------|-----|
| Preset model configs | Hardcoded in `modelConfig.js` | Quick model switching from known-good models | Avoids arbitrary HF search for a PoC demo |
| Custom model ID input | Text input | Power users can enter any `onnx-community/*` model | Flexibility without complexity |

**Confidence: HIGH**

#### Recommended Preset Models

Based on research into what works reliably with transformers.js v4 + WebGPU + q4 quantization:

| Model | HF ID | Size (q4) | Chat Template | Notes |
|-------|-------|-----------|---------------|-------|
| Gemma 4 E2B | `onnx-community/gemma-4-E2B-it-ONNX` | ~1.5 GB | Separate .jinja | Current default; good quality, needs template fix |
| Qwen3 0.6B | `onnx-community/Qwen3-0.6B-ONNX` | ~400 MB | Embedded | Fastest option; good for quick demos |
| Qwen3.5 0.8B | `onnx-community/Qwen3.5-0.8B-ONNX` | ~500 MB | Both (embedded + .jinja) | Newer Qwen, better quality than 0.6B |
| SmolLM2 1.7B | `HuggingFaceTB/SmolLM2-1.7B-Instruct` | ~1 GB | Embedded | Strong instruction following for its size |
| LFM2.5 350M | `onnx-community/LFM2.5-350M-ONNX` | ~250 MB | Separate .jinja | Ultra-small, Liquid AI edge model |

**Important caveats:**
- Not all models produce good structured output (the COLOR/STYLE/CATEGORY format). Gemma 4 and Qwen3 are verified for this use case.
- q4f16 is the recommended quantization for WebGPU (4-bit weights, fp16 activations).
- WASM fallback should use the same quantization; performance will be slower but functional.

### Model-Specific Configuration

| Config Property | Purpose | Per-Model? |
|----------------|---------|------------|
| `model` | HF model ID | Yes |
| `dtype` | Quantization (q4, q4f16, q8, fp16) | Yes |
| `device` | webgpu / wasm | Global (auto-detected) |
| `label` | Display name | Yes |
| `enableThinking` | Qwen3-specific thinking mode toggle | Yes (only Qwen3) |
| `temperature` | Generation temperature | Global default, overridable |
| `top_p` | Nucleus sampling | Global default, overridable |
| `max_tokens` | Max generation length | Global default, overridable |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Chat template fix | Fetch .jinja at load time | Hardcode template strings per model | Brittle, doesn't scale to custom models |
| Chat template fix | Fetch .jinja at load time | Switch to `pipeline()` API | Too much rework of existing adapter pattern |
| Chat template fix | Fetch .jinja at load time | Wait for upstream fix in transformers.js | Blocks the project; timeline unknown |
| Model switching | Worker dispose + restart | Keep single worker, swap model in-place | WebGPU memory leaks; clean restart is safer |
| Settings UI | Hash-based show/hide | react-router-dom | Over-engineering for a single hidden page in a PoC |
| Settings UI | Hash-based show/hide | URL query params | Hash is cleaner for client-only routing |
| Model discovery | Curated preset list + custom input | Full HF Hub search (like CompareLocalLLM) | Over-engineering for PoC; CompareLocalLLM is a model comparison tool, DynamicPLP is a product demo |
| Transformers.js version | Stay on 4.0.1 | Upgrade to latest | 4.0.1 is current stable; no newer version needed |

## Do NOT Add

| Library | Why Not |
|---------|---------|
| `react-router-dom` | No routing needed for one hidden page |
| `zustand` | TinyBase already handles state; adding a second store library adds confusion |
| `web-llm` (MLC) | Different runtime (MLC compiled models, not ONNX); would require complete inference rewrite |
| TypeScript | Out of scope per PROJECT.md constraints |
| `@huggingface/hub` | The HF Hub JS SDK; overkill when a simple `fetch()` to the REST API suffices |

## Transformers.js v4 Key Facts

**Confidence: HIGH** -- Verified from installed source code and official docs.

| Fact | Detail |
|------|--------|
| Current version in project | 4.0.1 (matches latest stable on npm) |
| Chat template source | Only `tokenizer_config.json` -- does NOT auto-load `chat_template.jinja` |
| Jinja engine | `@huggingface/jinja` (bundled), supports variables, loops, conditionals, filters |
| `apply_chat_template` accepts | `chat_template` param for manual override; `add_generation_prompt`, `tokenize`, `tools` |
| Worker support | Works in Web Workers via `import` (ES modules) |
| WebGPU detection | Auto-fallback to WASM if WebGPU unavailable (already implemented in adapter) |
| Model caching | Uses browser Cache API (`transformers-cache`); models persist across sessions |
| Progress reporting | `progress_callback` with `status` events: `initiate`, `progress`, `progress_total`, `done` |

## Installation

No new npm packages needed. All changes are code-level:

```bash
# No new dependencies required
# Existing stack is sufficient
```

If the team later wants full HF Hub search (not recommended for PoC):
```bash
npm install @huggingface/hub
```

## Sources

- [Gemma 4 chat_template issue - huggingface/transformers#45205](https://github.com/huggingface/transformers/issues/45205)
- [Transformers.js chat templates - DeepWiki](https://deepwiki.com/huggingface/transformers.js/5.2-chat-templates)
- [Transformers.js default chat template issue #1049](https://github.com/huggingface/transformers.js/issues/1049)
- [onnx-community/gemma-4-E2B-it-ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX)
- [onnx-community/Qwen3-0.6B-ONNX](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX)
- [onnx-community/Qwen3.5-0.8B-ONNX](https://huggingface.co/onnx-community/Qwen3.5-0.8B-ONNX)
- [Transformers.js v4 announcement](https://huggingface.co/blog/transformersjs-v4)
- [Transformers.js tokenization_utils.js source](file:///node_modules/@huggingface/transformers/src/tokenization_utils.js) -- verified locally in installed package
- [CompareLocalLLM reference project](file:///Users/emanuele/Projects/CompareLocalLLM) -- user's own working model selector
- [HuggingFace model search API](https://huggingface.co/docs/hub/api) -- used by CompareLocalLLM for model discovery
- [onnx-community/LFM2.5-350M-ONNX](https://huggingface.co/onnx-community/LFM2.5-350M-ONNX)

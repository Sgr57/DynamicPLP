# Feature Research

**Domain:** Hidden LLM settings/config page for a browser-based AI demo PoC
**Researched:** 2026-04-14
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features the demo operator (sales engineer, developer) assumes exist on any LLM settings page. Missing these makes the page feel pointless.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Model selector dropdown | Core purpose of the page; must pick from a known list of compatible models | LOW | Hardcoded list of 2-4 ONNX models (Gemma 4 E2B, Qwen3 0.6B, possibly SmolLM2). No HuggingFace search needed -- this is a curated demo, not an open model hub. Use `modelConfig.js` MODELS dict as source. |
| Active model indicator | Operator needs to know which model is currently loaded and running | LOW | Show model label, status (loading/ready/error), and device (WebGPU/WASM). Already partially exists via `MODEL_LABEL` and `useModelLoader` status. |
| Model hot-swap (load different model) | Switching models is the primary action. Must dispose current worker and spawn new one. | MEDIUM | Requires: (1) terminate current Web Worker, (2) create new Worker with different config, (3) re-initialize useModelLoader. The `adapter.dispose()` + worker `dispose` message path already exists. Key challenge: propagating the new model choice to `useModelLoader` which currently reads `MODEL_CONFIG` at import time. Need reactive config. |
| Inference parameter sliders (temperature, top_p, max_tokens) | Standard in every LLM playground. Operators expect to tune these. | LOW | Three range inputs with numeric display. Values already defined in `MODEL_CONFIG`. Need to make them reactive rather than static imports. Ranges: temperature 0-1.5, top_p 0-1, max_tokens 50-500. |
| Hidden access mechanism (not visible in main nav) | PROJECT.md explicitly requires hidden page. Must be discoverable but not cluttering the demo UX. | LOW | Keyboard shortcut (Ctrl+Shift+S or similar). Alternative: click the "DynamicPLP" header text N times (mobile-friendly). Both patterns are well-established for hidden dev tools. |
| Current model status and health | When entering settings, operator needs to see if model is loaded, errored, or loading | LOW | Reuse `useModelLoader` status. Show: model name, load state, device, VRAM/memory estimate if available. |

### Differentiators (Competitive Advantage)

Features that elevate this from "config form" to "impressive demo settings page."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live inference test ("try it") | After changing model/params, fire a test prompt and see raw output. Proves the model works before returning to the PLP. | MEDIUM | Send a hardcoded test prompt through the existing `generate()` path, display raw response. Reuses entire inference pipeline. Impressive in demos because you see the LLM thinking in real time. |
| WebGPU capability display | Show GPU adapter info, whether WebGPU is available, WASM fallback status. Gives operator confidence the demo will work on this machine. | LOW | `navigator.gpu.requestAdapter()` already called in `detectDevice()`. Surface adapter info (vendor, architecture) if available. Existing `getDeviceCapabilities()` provides base data. |
| Per-model recommended settings | Each model entry in the config includes recommended temperature/top_p/max_tokens. When switching models, auto-populate with good defaults. | LOW | Add `recommendedParams` to each entry in the MODELS dict. Override sliders on model switch. Prevents operator from using Gemma settings on Qwen or vice versa. |
| Custom HuggingFace model ID input | Allow typing an arbitrary `onnx-community/...` model ID for advanced users who want to test their own fine-tuned models. | MEDIUM | Freeform text input. No validation beyond attempting to load. Failure handled by existing retry/error path. This is the "wow" feature for technical audiences: "you can plug in your own model." |
| Reset to defaults button | One click to restore all settings to their original values | LOW | Trivial. Store defaults separately from current values. |
| Tracking config toggles | Expose key tracking thresholds (cooldown, min interactions, reorder delay) for tuning the demo behavior | MEDIUM | Read from `TRACKING_CONFIG`. Would need to make the config reactive (currently a static export). Good for fine-tuning demo pacing during a sales call. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| HuggingFace model search/autocomplete | CompareLocalLLM has it, seems natural | Massive scope increase for a PoC settings page. Requires API integration, debounced search, model details fetching, quantization discovery. The reference project's ModelSelector is 500+ lines. Most demo operators will use 2-3 known models. | Curated dropdown of 3-5 tested models + one freeform input for power users. |
| Cache management UI (delete/cleanup cached models) | CompareLocalLLM has a full CachedModelsTable | Over-engineered for a PoC with 2-3 models. Cache management is a browser DevTools concern. Adds significant complexity (cache enumeration, deletion, size calculation). | Show total cache size as read-only info. Point to DevTools for cache clearing. |
| Quantization picker per model | Different quant levels (q4, q8, fp16) affect quality/speed | The ONNX model IDs already encode their quantization. The `dtype` field in modelConfig handles this. Exposing it adds confusion for non-technical operators. | Pre-select the best quantization per model in the curated list. Show it as read-only info. |
| Cloud/API model support | CompareLocalLLM supports OpenAI, Anthropic, Google | Completely contradicts the "local-first, no data leaves device" selling point. Adding cloud models would undermine the core demo narrative. | Explicitly do NOT support cloud models. The whole point is everything runs locally. |
| Real-time prompt editor | Let users edit the system prompt, few-shot examples | Opens a Pandora's box of broken demos. The prompt is carefully tuned with specific format expectations. Editing it will break the response parser. | Keep prompt read-only or show it as reference. If needed later, add as a separate advanced feature with validation. |
| Backend selection (WebGPU vs WASM toggle) | Users might want to force WASM | Already handled by automatic fallback in `detectDevice()`. Manual override adds complexity and confusion. If WebGPU works, always use it. | Show current backend as read-only info. Automatic fallback is the right UX. |
| Persist settings across sessions | Save chosen model and params to localStorage/IndexedDB | For a demo PoC, starting fresh each time is actually desirable. Stale settings from a previous demo session could cause confusion. | Default to the known-good model on each page load. Optionally, persist only within the current session (in-memory state). |

## Feature Dependencies

```
[Hidden access mechanism]
    └──requires──> (nothing, independent)

[Model selector dropdown]
    └──requires──> [Reactive model config]
                       └──requires──> [Worker restart capability]

[Inference parameter sliders]
    └──requires──> [Reactive model config]

[Model hot-swap]
    └──requires──> [Model selector dropdown]
    └──requires──> [Worker restart capability]
    └──requires──> [Reactive model config]

[Live inference test]
    └──requires──> [Model hot-swap] (must work with newly loaded model)
    └──enhances──> [Model selector dropdown] (proves selection works)

[Per-model recommended settings]
    └──enhances──> [Model selector dropdown] (auto-populate on switch)
    └──enhances──> [Inference parameter sliders]

[Custom HuggingFace model ID]
    └──requires──> [Model hot-swap]
    └──requires──> [Worker restart capability]

[WebGPU capability display]
    └──requires──> (nothing, independent)

[Tracking config toggles]
    └──requires──> [Reactive tracking config]
```

### Dependency Notes

- **Reactive model config is the critical foundation:** Currently `MODEL_CONFIG` is a static import evaluated once at module load. All model-related features require making this reactive -- either via React state lifted to App level, or a lightweight store (could use TinyBase `aiMemory` table, or simple React context).
- **Worker restart capability is the second foundation:** `useModelLoader` currently fires `startWorker()` once in a `useEffect([], [])`. Needs to accept a model config parameter and support re-initialization. The dispose/terminate path already exists.
- **Live inference test enhances model selector:** Without it, the operator switches models blindly and has to go back to the PLP to verify it works. With it, verification is immediate.
- **Custom HF model ID conflicts with curated simplicity:** Adding it means handling arbitrary load failures gracefully. Worth it for technical audiences but should be clearly marked as "advanced."

## MVP Definition

### Launch With (v1)

Minimum settings page that makes model switching actually work.

- [ ] Hidden access via keyboard shortcut (Ctrl+Shift+S) -- lowest effort, highest utility
- [ ] Reactive model config (lift MODEL_CONFIG into React state/context) -- foundation for everything else
- [ ] Worker restart capability (useModelLoader accepts config, can re-init) -- foundation for model swap
- [ ] Model selector from curated list (dropdown with 2-4 known models) -- core purpose of the page
- [ ] Model hot-swap (select model, dispose old, load new) -- core purpose delivered
- [ ] Active model status display (name, state, device) -- essential feedback
- [ ] Inference parameter sliders (temperature, top_p, max_tokens) -- expected by anyone who opens a settings page

### Add After Validation (v1.x)

Features to add once the core settings page works and the demo flow is validated.

- [ ] Per-model recommended settings -- triggered when demo operator picks wrong params for a model
- [ ] WebGPU capability display -- triggered when demoing on unfamiliar hardware
- [ ] Live inference test button -- triggered when operator wants to verify model before demoing
- [ ] Reset to defaults button -- triggered when settings get into a bad state during demo

### Future Consideration (v2+)

Features to defer until the PoC evolves or specific demand emerges.

- [ ] Custom HuggingFace model ID input -- only if technical audiences request it
- [ ] Tracking config toggles -- only if demo pacing becomes a pain point
- [ ] Prompt viewer (read-only) -- only if audiences ask "what prompt are you using?"

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Hidden access mechanism | HIGH | LOW | P1 |
| Reactive model config | HIGH | MEDIUM | P1 |
| Worker restart capability | HIGH | MEDIUM | P1 |
| Model selector dropdown | HIGH | LOW | P1 |
| Model hot-swap | HIGH | MEDIUM | P1 |
| Active model status | MEDIUM | LOW | P1 |
| Inference parameter sliders | MEDIUM | LOW | P1 |
| Per-model recommended settings | MEDIUM | LOW | P2 |
| Reset to defaults | LOW | LOW | P2 |
| WebGPU capability display | LOW | LOW | P2 |
| Live inference test | MEDIUM | MEDIUM | P2 |
| Custom HF model ID input | LOW | MEDIUM | P3 |
| Tracking config toggles | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for the settings page to be useful
- P2: Should have, adds polish and demo confidence
- P3: Nice to have, defer until demand exists

## Competitor/Reference Feature Analysis

| Feature | CompareLocalLLM (reference project) | WebLLM Chat Demo | DynamicPLP Approach |
|---------|-------------------------------------|-------------------|---------------------|
| Model selection | HuggingFace search + autocomplete (500+ lines) | Dropdown of pre-compiled models | Curated dropdown of 2-4 tested ONNX models. Simpler, faster, less error-prone. |
| Quantization | Per-model quant picker with size display | Fixed per model | Fixed per model in curated list (dtype in config). Show as read-only info. |
| Backend choice | WebGPU/WASM toggle per model | WebGPU only | Automatic detection with WASM fallback. No manual toggle. |
| Cloud models | OpenAI, Anthropic, Google with API keys | None | Explicitly excluded -- contradicts local-first narrative. |
| Cache management | Full table with sort, expand, delete, cleanup | Browser-managed | Not needed for 2-3 model PoC. |
| Inference params | Persisted via Zustand | Basic generation config | Reactive sliders, session-only (no persistence). |
| Settings persistence | localStorage via Zustand persist | Session only | Session only. Fresh start per demo is desirable. |
| Navigation | Dedicated /settings route with NavBar | Single page | Hidden page via keyboard shortcut. No routing library needed. |

## Sources

- Reference project analysis: `/Users/emanuele/Projects/CompareLocalLLM` (direct code inspection)
- Existing codebase analysis: `src/data/modelConfig.js`, `src/lib/modelAdapter.js`, `src/lib/adapters/transformersJsAdapter.js`, `src/hooks/useModelLoader.js`, `src/lib/modelWorker.js`
- [WebLLM - High-performance In-browser LLM Inference Engine](https://github.com/mlc-ai/web-llm)
- [Transformers.js documentation](https://huggingface.co/docs/transformers.js/en/index)
- [Transformers.js v4 announcement](https://huggingface.co/blog/transformersjs-v4)
- [LLM Parameters Guide - Temperature, Top-P, Top-K](https://amitray.com/llm-parameters-temperature-top-p-top-k-guide/)
- [Prompt Engineering Guide - LLM Settings](https://www.promptingguide.ai/introduction/settings)

---
*Feature research for: Hidden LLM settings page in browser-based AI demo PoC*
*Researched: 2026-04-14*

# Domain Pitfalls

**Domain:** Browser-based AI PLP stabilization (Transformers.js, dead code removal, model hot-swap)
**Researched:** 2026-04-14

## Critical Pitfalls

Mistakes that cause regressions, broken inference, or require significant rework.

### Pitfall 1: Gemma 4 ONNX Repo Missing `chat_template` in `tokenizer_config.json`

**What goes wrong:** `apply_chat_template()` throws `"Cannot use chat template functions because tokenizer.chat_template is not set"` because `onnx-community/gemma-4-E2B-it-ONNX` ships the chat template only as a separate `chat_template.jinja` file (16 KB), not embedded in `tokenizer_config.json`. Transformers.js `AutoTokenizer.from_pretrained()` reads `tokenizer_config.json` but does NOT auto-load the `.jinja` file.

**Why it happens:** Google changed Gemma 4's packaging to use a standalone `chat_template.jinja` instead of embedding the template string in `tokenizer_config.json`. The Python `transformers` library was updated to auto-detect the `.jinja` file; Transformers.js (JavaScript) was not. This is confirmed: the upstream issue ([huggingface/transformers#45205](https://github.com/huggingface/transformers/issues/45205)) remains open as of April 2026, and the ONNX repo's `tokenizer_config.json` verified to contain zero `chat_template` field.

**Consequences:** Complete inference pipeline breakage. The adapter throws on `this.tokenizer.apply_chat_template(messages, templateOpts)` at line 105 of `transformersJsAdapter.js`. No fallback, no graceful degradation -- the generate() call fails and useReranker catches it silently.

**Prevention:**
1. After loading the tokenizer, check `tokenizer.chat_template` existence before calling `apply_chat_template()`
2. If missing, fetch the `.jinja` file from the model repo and assign: `this.tokenizer.chat_template = templateString`
3. Alternatively, use `apply_chat_template(messages, { ...templateOpts, chat_template: templateString })` if the API supports a template argument
4. As a last resort, hardcode the Gemma chat template for known models in `modelConfig.js`
5. Long-term: monitor the upstream HF issue for resolution

**Detection:** The error is immediate and deterministic -- any attempt to generate with Gemma 4 E2B will throw. Test by calling `adapter.generate()` after load.

**Confidence:** HIGH -- verified by inspecting the actual ONNX repo `tokenizer_config.json` (no `chat_template` field present) and confirmed via [HF discussion](https://huggingface.co/google/gemma-4-E2B-it/discussions/8).

**Phase relevance:** Phase 1 (fix chat_template regression) -- this IS the regression.

---

### Pitfall 2: Passing Model-Specific Parameters to `apply_chat_template` Crashes Other Models

**What goes wrong:** The codebase currently passes `enable_thinking` to `apply_chat_template()` when the Qwen3 model is configured (lines 101-104 of `transformersJsAdapter.js`). If this parameter is passed to a Gemma tokenizer whose Jinja template does not define `enable_thinking`, the Jinja renderer may throw an `UndefinedError` or silently produce malformed output. Conversely, if Qwen3 is used without `enable_thinking: false`, it generates `<think>...</think>` blocks that the response parser cannot handle.

**Why it happens:** Chat templates are Jinja templates, and extra kwargs become template variables. The Qwen3 template checks `if enable_thinking is defined`; the Gemma template does not reference it at all. Whether an undefined variable causes a hard error or is silently ignored depends on the Jinja runtime's `undefined` handling (strict vs. permissive).

**Consequences:** 
- With Gemma: possible template rendering error or unexpected output format
- With Qwen3 (thinking enabled): `<think>` blocks in output break the line-based parser, which expects `COLOR`, `STYLE`, `CATEGORY` lines -- not XML-like thinking blocks

**Prevention:**
1. Move `enable_thinking` into model-specific config, not as a generic adapter property
2. Guard the parameter: only add it to `templateOpts` if the tokenizer's chat_template contains `enable_thinking`
3. For Qwen3 specifically, always set `enable_thinking: false` for structured output tasks (the thinking block wastes tokens and breaks parsing)
4. Add a `templateExtras` map in `modelConfig.js` per model, instead of a global flag

**Detection:** Test each model configuration end-to-end. If output contains `<think>` blocks or template errors, this pitfall has been hit.

**Confidence:** MEDIUM -- the `_enableThinking` guard exists (line 102), but the interaction with templates that don't define the variable is implementation-dependent in `@huggingface/jinja`.

**Phase relevance:** Phase 1 (fix chat_template) and Phase 4 (model settings/hot-swap).

---

### Pitfall 3: WebGPU Memory Not Freed After `model.dispose()` -- Worker Termination Required

**What goes wrong:** Calling `model.dispose()` on a Transformers.js model loaded with `device: 'webgpu'` does NOT reliably free GPU memory. ONNX Runtime Web's WebGPU backend retains GPU buffer allocations even after session release. Loading a second model (hot-swap) causes GPU OOM or `device lost` errors.

**Why it happens:** WebGPU GPU memory management in ONNX Runtime Web is incomplete. `session.release()` marks buffers for garbage collection but doesn't force immediate deallocation. The GPU driver reuses the device context within the same worker thread, so memory accumulates. This is a [known ONNX Runtime issue](https://github.com/microsoft/onnxruntime/issues/21574) partially addressed in PR #22490 but not fully resolved for all use cases.

**Consequences:** 
- Model hot-swap fails silently: new model loads but GPU runs out of memory mid-inference
- `GPUDevice lost` errors that crash the worker and require full page reload
- Memory grows linearly with each model switch, no plateau

**Prevention:**
1. **Terminate the worker entirely** between model switches -- this is the only reliable way to free GPU memory (the CompareLocalLLM reference project does exactly this: `worker.terminate(); worker = null` after each run)
2. Add a 50-100ms delay between worker termination and new worker creation to let GPU driver reclaim
3. Never try to `dispose()` and reuse the same worker for a different model
4. Monitor GPU memory via `navigator.gpu.requestAdapter()` info if available, but don't rely on it

**Detection:** Test model switching 3+ times in sequence. If second or third switch fails with OOM or device-lost, this pitfall is active.

**Confidence:** HIGH -- confirmed via [transformers.js#860](https://github.com/huggingface/transformers.js/issues/860) (memory leak), CompareLocalLLM reference code (terminates workers between models), and [ONNX Runtime#21574](https://github.com/microsoft/onnxruntime/issues/21574).

**Phase relevance:** Phase 4 (model settings/hot-swap) -- critical architectural constraint.

---

### Pitfall 4: Removing `sandbox.html` Entry Point Breaks Vite Build

**What goes wrong:** `vite.config.js` declares `sandbox.html` as a Rollup input entry (line 11). Removing `sandbox.html` without updating `vite.config.js` causes `npm run build` to fail with `Could not resolve entry module "sandbox.html"`. Conversely, removing the entry from config but leaving `sandbox.html` creates orphaned files.

**Why it happens:** Vite multi-page apps require explicit input declarations. The sandbox was added as a development testing tool but wired into the production build config. Removing one without the other creates a broken state.

**Consequences:** Broken production builds (if file removed first) or bloated bundle with test page included (if only config removed).

**Prevention:**
1. Always remove the Vite config entry AND the HTML file atomically in the same commit
2. Verify with `npm run build` after removal
3. Check for any imports from sandbox-specific code that might be tree-shaken differently without the entry point

**Detection:** `npm run build` fails immediately. Easy to catch but easy to forget.

**Confidence:** HIGH -- directly visible in `vite.config.js` line 11.

**Phase relevance:** Phase 2 (remove sandbox and dead code).

## Moderate Pitfalls

### Pitfall 5: Dead `webLlmAdapter.js` Imports Non-Existent Dependency

**What goes wrong:** `src/lib/adapters/webLlmAdapter.js` imports `@mlc-ai/web-llm` (line 1), which is NOT in `package.json`. The file is dead code -- no other file imports it. However, it exists in the adapter directory alongside `transformersJsAdapter.js`, creating confusion about which adapters are actually available.

**Why it happens:** The WebLLM adapter was likely an early experiment that was abandoned but never cleaned up. The import would fail at runtime if ever loaded, but since nothing imports it, it's benign... until someone tries to use it for model hot-swap.

**Consequences:**
- Misleading codebase: developers may think WebLLM is a supported backend
- If someone wires it into the model adapter factory for hot-swap, it will crash at import time
- Bundle analyzers flag it as dead code, adding noise

**Prevention:**
1. Delete `webLlmAdapter.js` during dead code cleanup
2. If WebLLM support is desired later, recreate it with the actual dependency installed
3. Grep for `WebLlmAdapter` references in docs (found in `.planning/codebase/ARCHITECTURE.md` line 149) and clean those too

**Detection:** `grep -r "web-llm\|WebLlm" src/` shows exactly one file with no importers.

**Confidence:** HIGH -- verified by grep: no importer exists, `@mlc-ai/web-llm` not in `package.json`.

**Phase relevance:** Phase 2 (dead code removal).

---

### Pitfall 6: Silent Error Swallowing Masks Chat Template Failures

**What goes wrong:** The LLM inference pipeline in `useReranker.js` catches errors at line 109 (`catch (err) { logger.llmError(err); weights = getWeights() }`) and the outer try-catch at line 154 is completely silent. When `apply_chat_template` fails, the error is caught, the previous weights are reused, and the user sees no indication that inference is broken. The system appears to "work" but never updates recommendations.

**Why it happens:** The dual-flow orchestrator was designed for graceful degradation (use last weights on failure). This is correct for transient errors (timeout, OOM) but disastrous for deterministic errors (missing chat_template) because the system retries every 2 seconds forever, silently failing each time.

**Consequences:**
- Broken inference appears as "the AI just isn't updating" rather than a clear error
- Console fills with repeated error logs that are easy to miss
- Demo presenter doesn't realize the LLM is non-functional
- CPU/GPU wasted on repeated failed template rendering

**Prevention:**
1. Differentiate between transient and fatal errors in the catch block
2. After N consecutive failures (e.g., 3), escalate status from 'analyzing' to 'error' and surface it in the UI
3. Check for known fatal error signatures: "chat_template is not set", "Model not ready"
4. Add an error counter to the debug panel (AIReasoningPanel)

**Detection:** Open the debug panel and check if LLM weights never update after interaction. Check console for repeated `apply_chat_template` errors.

**Confidence:** HIGH -- directly visible in `useReranker.js` lines 108-112 and 154.

**Phase relevance:** Phase 1 (fix chat_template) and Phase 3 (refactor).

---

### Pitfall 7: Model Hot-Swap Requires Worker Lifecycle Redesign

**What goes wrong:** The current `useModelLoader` hook creates a single worker on mount and never recreates it (the `useEffect` has `[]` deps, line 112). There is no mechanism to tell the worker "unload model A, load model B." The `dispose` message exists in the worker (line 33) but `useModelLoader` never sends it. Adding model switching without redesigning the worker lifecycle leads to the GPU memory leak described in Pitfall 3.

**Why it happens:** The hook was designed for a single-model PoC. The worker holds a module-level `adapter` variable that is set once. The `dispose` type is handled but the hook has no codepath to trigger it followed by a new `load`.

**Consequences:**
- Naive model switching (send 'dispose' then 'load') leaks GPU memory
- Adding model switching as a feature request without worker termination will appear to work in testing but fail after 2-3 switches in production

**Prevention:**
1. Model switching must terminate the old worker and create a new one (pattern from CompareLocalLLM: `worker.terminate(); worker = null; worker = new Worker(...)`)
2. The `useModelLoader` hook needs a `switchModel(newConfig)` function that: (a) rejects pending promises, (b) terminates worker, (c) creates fresh worker with new config
3. Pass model config to the worker via the `load` message (not hardcoded via `import`)
4. The worker must NOT import `modelConfig.js` at module level -- config should come from the main thread

**Detection:** Attempt to switch models 3 times in a row. If the third switch fails or the tab crashes, worker lifecycle is not properly managed.

**Confidence:** HIGH -- verified from codebase: `useModelLoader` has no switchModel capability, worker imports `modelAdapter.js` which statically reads `MODEL_CONFIG`.

**Phase relevance:** Phase 4 (model settings/hot-swap) -- blocking architectural issue.

---

### Pitfall 8: Stale IndexedDB Cache Persists Weights for Wrong Model

**What goes wrong:** When switching models, the `aiMemory` table in IndexedDB still contains `last_weights` from the previous model. The new model may have different weight distributions, confidence patterns, or even different category/color understanding. Pre-ranking on mount (line 52-63 of `useReranker.js`) applies the old model's weights, creating a jarring mismatch when the new model starts producing fresh weights.

**Why it happens:** The persistence layer has no concept of "which model produced these weights." TinyBase stores weights as flat key-value pairs in `aiMemory` without a model identifier.

**Consequences:**
- User sees products ranked by old model's preferences for the first few seconds
- New model's first inference may produce dramatically different ranking, causing a sudden visual jump
- If switching between models with different output formats (e.g., different color names), old weights reference non-existent keys

**Prevention:**
1. Namespace weights by model ID in `aiMemory`: `last_weights_gemma4`, `last_weights_qwen3`
2. On model switch, clear `last_weights` or swap to the correct namespace
3. Add a `model_id` field to the stored weights object for validation on load
4. Consider showing a brief "re-analyzing" indicator during model switch

**Detection:** Switch models and observe if the initial product order matches the previous model's output before the new model starts generating.

**Confidence:** MEDIUM -- inferred from architecture (no model ID in weights storage), not from observed bug.

**Phase relevance:** Phase 4 (model settings/hot-swap).

## Minor Pitfalls

### Pitfall 9: Hardcoded Model Config Import in Worker Prevents Dynamic Model Loading

**What goes wrong:** `modelWorker.js` imports `createModelAdapter` from `modelAdapter.js`, which statically imports `MODEL_CONFIG` from `modelConfig.js`. The model ID is determined at import time, not at runtime. To switch models, you cannot just message the worker with a new config -- you must terminate and recreate it.

**Why it happens:** The factory pattern (`createModelAdapter()`) reads config at call time, but the import chain is static. In a Web Worker, module imports are cached.

**Prevention:**
1. Change `modelWorker.js` to accept model config in the `load` message: `{ type: 'load', config: { model, dtype, device, ... } }`
2. Change `createModelAdapter(config)` to accept config as a parameter instead of importing it
3. Keep `modelConfig.js` as the source of defaults, but allow runtime override

**Detection:** Try to load a different model by changing `ACTIVE_MODEL` and sending a new 'load' message without terminating the worker -- it will load the same model.

**Confidence:** HIGH -- directly visible in code.

**Phase relevance:** Phase 4 (model settings/hot-swap).

---

### Pitfall 10: Removing Sandbox May Leave Orphaned `.playwright-mcp/` Directory

**What goes wrong:** The untracked `.playwright-mcp/` directory (visible in git status) may contain test infrastructure related to `sandbox.html`. Removing sandbox without checking for related test/automation files leaves orphaned infrastructure.

**Why it happens:** Test tooling directories are often created by automation and not tracked in version control.

**Prevention:**
1. Before deleting sandbox, check what `.playwright-mcp/` contains and whether it depends on `sandbox.html`
2. If it's sandbox-related test infrastructure, remove it in the same cleanup pass
3. Add `.playwright-mcp/` to `.gitignore` if it's auto-generated tooling

**Detection:** `ls -la .playwright-mcp/` -- check for sandbox references.

**Confidence:** LOW -- the connection between `.playwright-mcp/` and `sandbox.html` is inferred from proximity, not confirmed.

**Phase relevance:** Phase 2 (dead code removal).

---

### Pitfall 11: Response Parser Mismatch When Switching Between Model Output Styles

**What goes wrong:** Different models produce different output formats for the same prompt. Gemma 4 tends to follow the Italian line-based format well. Qwen3 0.6B (being smaller) may produce JSON instead, or mix formats. The parser has both line-based and JSON fallback, but the few-shot example in the prompt is calibrated for a specific model's tendencies.

**Why it happens:** The few-shot example and system prompt were tuned for Gemma. Smaller models may need different prompting strategies (more explicit structure, shorter examples, English instead of Italian).

**Prevention:**
1. Store prompt templates per model in `modelConfig.js`, not as a single global prompt
2. Test each supported model's output against the parser before adding it as an option
3. Consider adding a model-specific post-processing step that normalizes output before parsing
4. The JSON fallback in `responseParser.js` is good insurance -- keep it

**Detection:** Run inference with each model and log the raw output. If parse rate drops below 80%, the prompt needs model-specific tuning.

**Confidence:** MEDIUM -- based on general knowledge of small model behavior, not tested with these specific models.

**Phase relevance:** Phase 4 (model settings/hot-swap).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Fix chat_template (Phase 1) | Gemma 4 ONNX repo missing `chat_template` (Pitfall 1) | Fetch `.jinja` file or embed template string; check `tokenizer.chat_template` existence after load |
| Fix chat_template (Phase 1) | Silent error swallowing masks the root cause (Pitfall 6) | Add fatal error detection to inference loop; surface persistent failures in UI |
| Fix chat_template (Phase 1) | enable_thinking parameter incompatible across models (Pitfall 2) | Only pass model-specific template params; guard with `if (template.includes('enable_thinking'))` |
| Dead code removal (Phase 2) | Vite config still references `sandbox.html` (Pitfall 4) | Remove config entry AND file atomically; verify with `npm run build` |
| Dead code removal (Phase 2) | `webLlmAdapter.js` references uninstalled dependency (Pitfall 5) | Delete file and clean doc references |
| Dead code removal (Phase 2) | Orphaned `.playwright-mcp/` directory (Pitfall 10) | Audit contents before sandbox removal |
| Refactor (Phase 3) | Silent catch blocks throughout pipeline (Pitfall 6) | Replace with categorized error handling (transient vs fatal) |
| Model hot-swap (Phase 4) | GPU memory not freed after dispose (Pitfall 3) | Terminate worker between model switches |
| Model hot-swap (Phase 4) | Worker lifecycle not designed for reuse (Pitfall 7) | Terminate + recreate worker; pass config via message |
| Model hot-swap (Phase 4) | Stale weights from previous model (Pitfall 8) | Namespace weights by model ID in aiMemory |
| Model hot-swap (Phase 4) | Static model config import in worker (Pitfall 9) | Accept config in load message, not at import time |
| Model hot-swap (Phase 4) | Response parser calibrated for single model (Pitfall 11) | Per-model prompt templates; test parse rate per model |

## Sources

- [Gemma 4 chat_template missing from tokenizer_config.json -- huggingface/transformers#45205](https://github.com/huggingface/transformers/issues/45205) -- HIGH confidence
- [Embed chat_template in tokenizer_config.json -- google/gemma-4-E2B-it discussion](https://huggingface.co/google/gemma-4-E2B-it/discussions/8) -- HIGH confidence
- [onnx-community/gemma-4-E2B-it-ONNX repo](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX) -- HIGH confidence (verified tokenizer_config.json contents)
- [Confusing error when chat_template not set -- transformers.js#964](https://github.com/huggingface/transformers.js/issues/964) -- HIGH confidence
- [Default chat template issue -- transformers.js#1049](https://github.com/huggingface/transformers.js/issues/1049) -- MEDIUM confidence
- [Severe memory leak with WebGPU -- transformers.js#860](https://github.com/huggingface/transformers.js/issues/860) -- HIGH confidence
- [How to free WebGPU GPU mem -- onnxruntime#21574](https://github.com/microsoft/onnxruntime/issues/21574) -- HIGH confidence
- [WebGPU crash with translation pipeline -- transformers.js#1380](https://github.com/huggingface/transformers.js/issues/1380) -- MEDIUM confidence
- [Chat Templates in transformers.js -- DeepWiki](https://deepwiki.com/huggingface/transformers.js/5.2-chat-templates) -- MEDIUM confidence
- CompareLocalLLM reference project (local codebase, verified worker termination pattern) -- HIGH confidence

---

*Pitfalls audit: 2026-04-14*

# Phase 1: Restore Inference - Research

**Researched:** 2026-04-14
**Domain:** Transformers.js in-browser LLM inference, Gemma 4 chat template fix
**Confidence:** HIGH

## Summary

The inference pipeline is broken because Gemma 4 models ship `chat_template` as a separate `.jinja` file rather than embedding it in `tokenizer_config.json`. Transformers.js v4.0.1's `AutoTokenizer.from_pretrained()` only reads `tokenizer_config.json` -- it does NOT automatically load `chat_template.jinja`. When `tokenizer.chat_template` is null, `apply_chat_template()` throws: "Cannot use apply_chat_template() because tokenizer.chat_template is not set."

The fix is straightforward: after loading the tokenizer, check if `tokenizer.chat_template` is null, then fetch `chat_template.jinja` from HuggingFace Hub and assign it to `tokenizer.chat_template` before any `apply_chat_template()` call. The library's own `Gemma4Processor` class does exactly this internally (via `getModelText`), but that function is not publicly exported.

Additionally, 7 files have uncommitted working tree changes. These changes include: multi-model registry in modelConfig.js, switch from `Gemma4ForConditionalGeneration` to `AutoModelForCausalLM`, prompt simplification (7 lines to 6 lines), removal of PROFILE parsing, synthetic profile builder, and a sandbox.html multi-entry Vite config. Each change must be evaluated per decision D-01/D-02.

**Primary recommendation:** Fetch `chat_template.jinja` via `fetch()` using the HuggingFace Hub URL pattern (`https://huggingface.co/{modelId}/resolve/main/chat_template.jinja`), inject onto `tokenizer.chat_template` in the adapter's `load()` method, and fail visibly if fetch fails (D-04).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Inspect all 7 modified files (modelConfig.js, useReranker.js, transformersJsAdapter.js, modelAdapter.js, promptBuilder.js, responseParser.js, vite.config.js) by reading diffs before making any changes. Decide per-file whether to keep, discard, or modify.
- **D-02:** No prior assumptions about which changes are good or bad -- evaluate all diffs equally without bias.
- **D-03:** Generic solution -- auto-detect missing `chat_template` on tokenizer after load. If null, fetch the `.jinja` template file from HuggingFace Hub and inject it. Must work for any ONNX model, not just Gemma 4 E2B.
- **D-04:** On template fetch failure (offline, 404, network error): show clear error in UI and disable AI inference. No silent degradation, no bundled fallback strings.
- **D-05:** Verify against all 4 roadmap success criteria: (1) no console errors related to chat_template/tokenizer, (2) grid visibly reorders after 10-15s browsing, (3) AIReasoningPanel shows updated weights and parsed LLM response, (4) reordering persists across page reload via saved weights.
- **D-06:** Test only the active model (Gemma 4 E2B). Qwen3 0.6B testing deferred to Phase 4 settings page.

### Claude's Discretion
- Template fetch implementation details (URL construction, caching, retry logic)
- Error message wording and UI placement for template fetch failures
- Which working tree changes to keep vs discard (after inspecting diffs)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFER-01 | Fix chat_template regression -- fetch `.jinja` template file and inject onto tokenizer when `tokenizer.chat_template` is null after load | Chat template fix pattern fully researched: URL pattern, injection point, error handling. See Architecture Patterns section. |
| INFER-02 | Verify end-to-end inference produces valid ranked output (LLM generates parseable response, weights applied, products reorder) | Working tree diff analysis provides full picture of all pipeline changes; verification criteria mapped to 4 success criteria in D-05. |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @huggingface/transformers | 4.0.1 | In-browser LLM inference via ONNX Runtime | Already installed; provides AutoTokenizer, AutoModelForCausalLM, Gemma4ForConditionalGeneration [VERIFIED: npm ls output] |
| tinybase | 5.0.0 | Reactive store with IndexedDB persistence | Already installed; provides all data access [VERIFIED: package.json] |

### Supporting
No new libraries needed for this phase. The fix uses only the browser's native `fetch()` API and existing `@huggingface/transformers` APIs.

**Version verification:**
- `@huggingface/transformers`: 4.0.1 installed, 4.0.1 latest on npm [VERIFIED: npm view output]
- No package changes needed for this phase

## Architecture Patterns

### The Chat Template Problem

**Root cause:** Gemma 4 models store `chat_template` as a separate `chat_template.jinja` file in the HuggingFace repo, NOT in `tokenizer_config.json`. The `onnx-community/gemma-4-E2B-it-ONNX` model's `tokenizer_config.json` has no `chat_template` field. [VERIFIED: HuggingFace Hub raw file check]

**How Transformers.js handles this internally:** The `Gemma4Processor` class has `static uses_chat_template_file = true` and calls `getModelText(modelId, 'chat_template.jinja')` to load the template, then passes it via the `chat_template` option to `apply_chat_template()`. [VERIFIED: node_modules source inspection of processing_gemma4.js]

**Why AutoTokenizer doesn't do this:** `AutoTokenizer.from_pretrained()` reads `tokenizer_config.json` and assigns `this.chat_template = tokenizerConfig.chat_template ?? null`. It never looks for `.jinja` files. [VERIFIED: tokenization_utils.js line 209]

### Pattern 1: Chat Template Auto-Injection in Adapter Load

**What:** After `AutoTokenizer.from_pretrained()` completes, check `tokenizer.chat_template`. If null, fetch the `.jinja` file from HuggingFace Hub and inject it.
**When to use:** During adapter `load()`, after tokenizer load but before model load.
**Why generic (D-03):** The check is model-agnostic -- any ONNX model missing chat_template will trigger the fetch. The URL pattern `https://huggingface.co/{modelId}/resolve/main/chat_template.jinja` is the standard HuggingFace Hub file access pattern. [VERIFIED: hub.js lines 131-136]

**Example:**
```javascript
// Source: [VERIFIED: HuggingFace Hub URL pattern from node_modules hub.js + tokenization_utils.js]
async load(onProgress) {
  // ... existing code ...
  
  this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId, { ... })
  
  // Generic chat_template injection for models that ship it as a separate file
  if (!this.tokenizer.chat_template) {
    const templateUrl = `https://huggingface.co/${this.modelId}/resolve/main/chat_template.jinja`
    const resp = await fetch(templateUrl)
    if (!resp.ok) {
      throw new Error(`chat_template non disponibile: ${resp.status} ${resp.statusText}`)
    }
    this.tokenizer.chat_template = await resp.text()
  }
  
  // ... existing model load code ...
}
```

**Alternative approach (passing via options):** Instead of setting `tokenizer.chat_template`, pass the template string via the `chat_template` option in `apply_chat_template()`. The API supports this: `tokenizer.apply_chat_template(messages, { chat_template: templateString, ... })`. [VERIFIED: tokenization_utils.js lines 694-711, API docs] However, injecting directly onto the tokenizer object is simpler and matches how the library itself stores it.

### Pattern 2: Error Propagation for Template Fetch Failure (D-04)

**What:** If the `.jinja` fetch fails (offline, 404, network error), throw from `load()` so the worker reports `type: 'error'` to `useModelLoader`, which then sets `status='error'` after retry exhaustion.
**When to use:** Always -- this is the only error path per D-04.

The existing retry mechanism in `useModelLoader` (MAX_RETRIES=2) will naturally attempt the load again. After all retries fail, `setStatus('error')` disables AI. The error message should be descriptive so it can surface in the UI.

### Pattern 3: Working Tree Diff Evaluation Framework

Per D-01/D-02, each of the 7 modified files must be individually evaluated. Here is the analysis:

| File | Change Summary | Assessment |
|------|---------------|------------|
| `modelConfig.js` | Multi-model MODELS registry + ACTIVE_MODEL selector | **KEEP** -- Good refactor toward Phase 4 settings page; data-only, no side effects |
| `transformersJsAdapter.js` | (a) `Gemma4ForConditionalGeneration` -> `AutoModelForCausalLM`, (b) enable_thinking conditional | **MODIFY** -- Keep (b) enable_thinking conditional. For (a): Both work, but `AutoModelForCausalLM` auto-resolves to `Gemma4ForCausalLM` via the model registry, so it is more generic and aligns with D-03. Keep. |
| `modelAdapter.js` | Passes `enableThinking` from config to adapter | **KEEP** -- Required for multi-model support (Qwen3 needs `enable_thinking: false`) |
| `promptBuilder.js` | Simplified from 7-line to 6-line format, shorter prompt, removed PROFILE line, removed trailing "Rispondi con le 7 righe:" | **KEEP** -- Shorter prompts are better for small models; PROFILE was redundant (built from weights anyway). Format change from `CONFIDENCE: 0.8` to `CONFIDENCE 0.8` (no colon) is significant -- parser must match. |
| `responseParser.js` | Removed `PROFILE` from LINE_PREFIXES | **KEEP** -- Consistent with promptBuilder removing PROFILE from format. The parser already handles missing keys gracefully. |
| `useReranker.js` | Added `buildSyntheticProfile()` to construct profile from weights instead of extracting from LLM output | **KEEP** -- Since PROFILE line was removed from prompt format, profile must be built from weights. This is more reliable than depending on LLM text output. |
| `vite.config.js` | Added sandbox.html as multi-entry rollup input | **DISCARD** -- sandbox.html is flagged for removal in Phase 2 (CLEAN-01). Adding it to build config is the wrong direction. |

### Recommended Project Structure (no changes)
```
src/
  lib/
    adapters/
      transformersJsAdapter.js  # Chat template fix goes here (in load())
    modelAdapter.js             # Already refactored for enableThinking
    modelWorker.js              # No changes needed
    promptBuilder.js            # Already simplified (keep working tree)
    responseParser.js           # PROFILE removed (keep working tree)
  hooks/
    useReranker.js              # Synthetic profile builder (keep working tree)
    useModelLoader.js           # No changes needed (retry handles errors)
  data/
    modelConfig.js              # Multi-model registry (keep working tree)
```

### Anti-Patterns to Avoid
- **Bundling fallback chat_template strings**: Per D-04, no bundled fallbacks. If fetch fails, error out. Bundled strings are model-specific and become stale.
- **Using `Gemma4Processor` instead of direct tokenizer+model**: The Processor loads images/audio processing which this text-only use case doesn't need. It also changes the API surface significantly.
- **Caching the chat_template in IndexedDB manually**: The HuggingFace model cache (browser Cache API) already caches the tokenizer files. A separate cache layer adds complexity for no gain in this PoC.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat template parsing | Custom Jinja parser | `@huggingface/jinja` (already bundled in transformers.js) | Jinja2 templates can be complex; the library handles all edge cases |
| HuggingFace URL construction | Custom URL builder with revision handling | Standard pattern: `https://huggingface.co/{modelId}/resolve/main/{filename}` | This is the canonical HF Hub URL pattern [VERIFIED: hub.js] |
| Model class selection | Manual class mapping | `AutoModelForCausalLM.from_pretrained()` auto-resolves via registry | Registry maps `gemma4` -> `Gemma4ForCausalLM` automatically [VERIFIED: registry.js] |
| LLM retry logic | Custom retry in adapter | Existing `useModelLoader` MAX_RETRIES=2 with worker restart | Already handles worker failures gracefully |

## Common Pitfalls

### Pitfall 1: Prompt Format / Parser Mismatch
**What goes wrong:** The promptBuilder tells the LLM to output `CONFIDENCE 0.8` (no colon), but the parser expects `CONFIDENCE: 0.8` (with colon).
**Why it happens:** The working tree changes to promptBuilder removed colons from the format specification, but the parser uses `.replace(/^[:\s]+/, '')` which handles both formats.
**How to avoid:** Verify the parser's regex at `responseParser.js` line 64 -- the pattern `replace(/^[:\s]+/, '')` strips leading colons AND spaces, so `CONFIDENCE 0.8` and `CONFIDENCE: 0.8` both work. [VERIFIED: source inspection]
**Warning signs:** Parser returns fallback weights (confidence=0.5, intent='deciding') instead of parsed values.

### Pitfall 2: CORS on chat_template.jinja Fetch
**What goes wrong:** Browser blocks `fetch('https://huggingface.co/...')` due to CORS.
**Why it happens:** HuggingFace Hub does serve files with permissive CORS headers for model files, but this hasn't been verified for `.jinja` files specifically.
**How to avoid:** Test the fetch in browser DevTools. HuggingFace Hub's `/resolve/` endpoint serves all files with `Access-Control-Allow-Origin: *`. [ASSUMED]
**Warning signs:** Network error in console, template fetch returns opaque response.

### Pitfall 3: Template Fetch in Web Worker Context
**What goes wrong:** `fetch()` in a Web Worker might behave differently than in the main thread.
**Why it happens:** Web Workers have `self.fetch` which works identically to `window.fetch` for standard HTTP requests. [VERIFIED: Web Workers spec supports fetch API]
**How to avoid:** Use standard `fetch()` -- it works in Worker context. The existing Transformers.js code already uses `fetch()` in Workers for model downloads.

### Pitfall 4: Synthetic Profile Missing on First Run
**What goes wrong:** First LLM analysis cycle has empty `userProfile` because `buildSyntheticProfile()` only runs after weights are received.
**Why it happens:** On the very first analysis, `getMemoryValue('user_profile')` returns empty string.
**How to avoid:** This is by design -- the prompt handles empty profile gracefully via the `profileSection` conditional in `buildPrompt()`. No action needed.

### Pitfall 5: Model Registry Config Object Spread
**What goes wrong:** `MODEL_CONFIG` spreads `MODELS[ACTIVE_MODEL]` then adds shared params. If a model entry has `temperature` it overrides the shared defaults.
**Why it happens:** Object spread precedence -- later properties override earlier ones.
**How to avoid:** Shared inference parameters come after the spread, so they always win. This is correct for now. Phase 4 (REFAC-03) will address per-model defaults.

### Pitfall 6: vite.config.js Sandbox Entry Breaks Build
**What goes wrong:** Build fails or produces incorrect output because `sandbox.html` doesn't exist or is later removed (Phase 2).
**Why it happens:** The working tree adds sandbox.html as a rollup input entry.
**How to avoid:** Discard this change (revert vite.config.js to committed state). The sandbox multi-entry config conflicts with CLEAN-01 in Phase 2.

## Code Examples

### Chat Template Injection in Adapter Load
```javascript
// Source: [VERIFIED: HuggingFace Hub URL pattern + tokenization_utils.js + processing_gemma4.js pattern]
// In TransformersJsAdapter.load(), after tokenizer load:

this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId, {
  progress_callback: (p) => { /* ... existing ... */ },
})

// Generic: auto-detect and fetch chat_template for any model that ships it separately
if (!this.tokenizer.chat_template) {
  const templateUrl = `https://huggingface.co/${this.modelId}/resolve/main/chat_template.jinja`
  try {
    const response = await fetch(templateUrl)
    if (response.ok) {
      this.tokenizer.chat_template = await response.text()
    } else if (response.status === 404) {
      throw new Error(
        `Modello ${this.modelId}: chat_template mancante (non in tokenizer_config.json ne' come file .jinja)`
      )
    } else {
      throw new Error(
        `Impossibile scaricare chat_template: ${response.status} ${response.statusText}`
      )
    }
  } catch (err) {
    if (err.message.includes('chat_template')) throw err
    throw new Error(`Errore di rete scaricando chat_template: ${err.message}`)
  }
}
```

### Verifying Parser Handles Both Colon Formats
```javascript
// Source: [VERIFIED: responseParser.js line 64]
// The existing regex handles both formats:
const rest = trimmed.substring(prefix.length).replace(/^[:\s]+/, '').trim()
// "CONFIDENCE: 0.8" -> prefix="CONFIDENCE", rest after strip = "0.8" OK
// "CONFIDENCE 0.8"  -> prefix="CONFIDENCE", rest after strip = "0.8" OK
```

### Reverting vite.config.js Sandbox Entry
```bash
# Discard only the sandbox multi-entry change
git checkout -- vite.config.js
# Then re-apply any other vite.config.js changes if needed (none expected)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chat_template` embedded in `tokenizer_config.json` | Separate `chat_template.jinja` file | Gemma 4 release (Mar 2026) | Breaks `AutoTokenizer` workflows that expect embedded template [VERIFIED: HF issue #45205] |
| `Gemma4ForConditionalGeneration` for text-only | `AutoModelForCausalLM` auto-resolves via registry | Transformers.js 4.0.1 | Both work; Auto is more generic [VERIFIED: registry.js maps gemma4 to both] |
| 7-line LLM response format (with PROFILE) | 6-line format (without PROFILE) | Working tree change | Simpler format = more reliable parsing from small models |
| LLM generates user_profile text | Synthetic profile built from weights | Working tree change | More reliable; not dependent on LLM following free-text instruction |

**Deprecated/outdated:**
- `Gemma4ForConditionalGeneration` direct import: Still works but less generic than `AutoModelForCausalLM` for a multi-model setup [VERIFIED: both are functional]
- The PR to embed chat_template in Gemma 4's tokenizer_config.json is "ready to merge" but the ONNX community model still lacks it as of 2026-04-14 [VERIFIED: HuggingFace Hub file check]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test framework installed |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFER-01 | chat_template fetched and injected when null | manual-only | Manual: load app in Chrome, check no console errors | N/A |
| INFER-02 | End-to-end inference produces ranked output | manual-only | Manual: browse products 10-15s, observe grid reorder | N/A |

**Justification for manual-only:** INFER-01 and INFER-02 require a real browser with WebGPU, real HuggingFace Hub access, and real model inference. These cannot be unit-tested without extensive mocking that would not validate the actual integration. The success criteria (D-05) are inherently manual verification steps.

### Sampling Rate
- **Per task commit:** Manual browser verification
- **Per wave merge:** Full 4-criteria check from D-05
- **Phase gate:** All 4 success criteria confirmed manually

### Wave 0 Gaps
None needed -- this phase's validation is entirely manual browser testing against the 4 success criteria. No test infrastructure to create.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A (local-first, no auth) |
| V3 Session Management | No | N/A (no sessions) |
| V4 Access Control | No | N/A (single-user local app) |
| V5 Input Validation | Yes | Response parser clamps weights [-1,1], confidence [0,1], validates intent enum [VERIFIED: responseParser.js] |
| V6 Cryptography | No | N/A (no crypto operations) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed LLM output | Tampering | Weight clamping, intent validation, JSON fallback parser [VERIFIED: existing responseParser.js] |
| chat_template.jinja injection | Tampering | Template is fetched from official HuggingFace Hub only; Jinja parser handles template rendering safely via @huggingface/jinja |
| CORS bypass via fetch | Information Disclosure | Standard `fetch()` with same-origin policy; HF Hub serves with `Access-Control-Allow-Origin: *` [ASSUMED] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | HuggingFace Hub serves chat_template.jinja with CORS `Access-Control-Allow-Origin: *` | Common Pitfalls, Pitfall 2 | Template fetch fails in browser; would need a proxy or different approach |
| A2 | The ONNX community model will continue to have chat_template.jinja until the tokenizer_config.json fix is merged upstream | Architecture Patterns | If upstream fixes the tokenizer_config.json, our code path (check null then fetch) becomes unnecessary but harmless |

**If A1 is wrong:** The fetch will fail, error handling per D-04 will surface it. Can be verified immediately by testing in browser DevTools.
**If A2 is wrong:** The null check makes the fetch conditional -- if tokenizer_config.json gets chat_template, the fetch is skipped entirely. No risk.

## Open Questions

1. **CORS on .jinja files from HuggingFace Hub**
   - What we know: HuggingFace Hub serves model files (JSON, ONNX) with permissive CORS
   - What's unclear: Whether `.jinja` files specifically get the same CORS treatment
   - Recommendation: Verify with a quick `fetch()` test in browser before implementing. If CORS blocks it, the `/resolve/` endpoint should still work as it's the same CDN path.

## Sources

### Primary (HIGH confidence)
- transformers.js v4.0.1 source code inspection: `tokenization_utils.js`, `processing_gemma4.js`, `registry.js`, `hub.js` -- verified chat_template handling, model registry mappings, URL patterns
- HuggingFace Hub file listing and raw file inspection for `onnx-community/gemma-4-E2B-it-ONNX` -- verified chat_template.jinja exists, tokenizer_config.json lacks chat_template field
- npm registry: `@huggingface/transformers` version 4.0.1 is latest

### Secondary (MEDIUM confidence)
- [GitHub issue #45205: Gemma4 chat_template missing from tokenizer_config.json](https://github.com/huggingface/transformers/issues/45205) -- confirmed this is a known upstream issue
- [HuggingFace discussion: Embed chat_template in tokenizer_config.json](https://huggingface.co/google/gemma-4-E2B-it/discussions/8) -- PR ready to merge but not yet propagated to ONNX model
- [Transformers.js tokenizers API docs](https://huggingface.co/docs/transformers.js/en/api/tokenizers) -- confirmed apply_chat_template accepts chat_template option parameter
- [DeepWiki: Chat Templates in Transformers.js](https://deepwiki.com/huggingface/transformers.js/5.2-chat-templates) -- confirmed Transformers.js does NOT auto-load .jinja files

### Tertiary (LOW confidence)
- CORS assumption for HuggingFace Hub `.jinja` files -- needs browser verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all verified against installed versions
- Architecture: HIGH -- fix pattern verified against library source code and upstream issue documentation
- Pitfalls: HIGH -- parser compatibility verified via source; CORS is the only uncertainty (easily testable)
- Working tree assessment: HIGH -- all 7 diffs read and analyzed against project context

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable; HuggingFace may fix upstream tokenizer_config.json sooner, but our approach is forward-compatible)

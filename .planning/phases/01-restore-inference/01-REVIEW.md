---
phase: 01-restore-inference
reviewed: 2026-04-14T12:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/data/modelConfig.js
  - src/hooks/useReranker.js
  - src/lib/adapters/transformersJsAdapter.js
  - src/lib/modelAdapter.js
  - src/lib/promptBuilder.js
  - src/lib/responseParser.js
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-14T12:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed six files covering the inference pipeline: model configuration, adapter layer, prompt building, response parsing, and the dual-flow reranker orchestrator. The code is generally well-structured with appropriate error handling for a PoC. No critical security or crash-level issues found.

Key concerns: (1) a missing `enableThinking` property on the active model means a Qwen3-specific feature is defined but never propagated when Gemma 4 is active, creating a latent config mismatch; (2) the `useReranker` hook has a stale closure risk where `generate` function identity changes are not reflected in Flow A's interval; (3) an error in `propagateColorWeights` is swallowed silently (the catch block at line 119 logs but then continues to use a potentially half-mutated `weights` object); (4) the `responseParser` prefix matching could produce false matches on LLM outputs with prefixed words (e.g., "COLORING" would match "COLOR").

## Warnings

### WR-01: Stale `generate` closure in Flow A interval

**File:** `src/hooks/useReranker.js:74-102`
**Issue:** The `setInterval` callback in Flow A (line 74) captures `generate` at the time the effect runs. The effect's dependency array `[engineReady, generate]` will tear down and recreate the interval when `generate` changes, but `generate` is created with `useCallback([], [])` in `useModelLoader` (stable reference). If `generate` ever changes identity (e.g., during a worker restart/retry), there is a window where the old interval fires with the stale `generate` reference before the effect re-runs. This is unlikely to cause issues in practice because `useModelLoader`'s `generate` is a stable `useCallback`, but the pattern is fragile -- a ref-based approach for `generate` would be more robust.
**Fix:** Store `generate` in a ref to avoid dependency on function identity:
```javascript
const generateRef = useRef(generate)
useEffect(() => { generateRef.current = generate }, [generate])
// In the interval callback, use generateRef.current instead of generate
```

### WR-02: Silent continuation after partial color propagation failure

**File:** `src/hooks/useReranker.js:118-121`
**Issue:** When `propagateColorWeights` throws (line 117-121), the catch block logs a warning but execution continues with `weights.color_weights` in a potentially inconsistent state. If `propagateColorWeights` mutates the passed object in-place (it does -- it creates a shallow copy via `{ ...rawWeights }` in `colorFamilies.js:65` so the original is safe) and then throws mid-iteration, the `weights.color_weights` ref still points to the original unmutated object, which is actually fine. However, the catch block reassigns nothing -- `weights.color_weights` retains the original raw weights. This is correct behavior but the comment "uso pesi raw" is misleading since it implies a deliberate fallback when really it is just not reassigning. More importantly, the `tProp` timing variable stays at 0, which will misrepresent the pipeline timing in the logger.
**Fix:** Make the intent explicit and log timing even on failure:
```javascript
try {
  const tProp0 = performance.now()
  weights.color_weights = propagateColorWeights(weights.color_weights)
  tProp = Math.round(performance.now() - tProp0)
} catch (err) {
  tProp = Math.round(performance.now() - tProp0)
  logger.warn('llm', `color propagation fallita: ${err.message}, uso pesi raw`)
}
```
Note: `tProp0` would need to be declared outside the try block for the catch to access it.

### WR-03: Prefix matching in parser can produce false positives on partial word matches

**File:** `src/lib/responseParser.js:63`
**Issue:** The line `trimmed.toUpperCase().startsWith(prefix)` will match any line whose first word starts with a known prefix. For example, an LLM line like `COLORFUL suggestions below` would match the `COLOR` prefix, and the rest of the line (`FUL suggestions below`) would be parsed as weight key-value pairs, silently producing garbage in `color_weights`. While the LLM is prompted to produce exact prefixes, small models can produce unexpected output formats.
**Fix:** Add a word-boundary check after the prefix match to ensure the prefix is a standalone token:
```javascript
if (!trimmed.toUpperCase().startsWith(prefix)) continue
const charAfterPrefix = trimmed[prefix.length]
// After the prefix, expect whitespace, colon, or end-of-line
if (charAfterPrefix && !/[\s:]/.test(charAfterPrefix)) continue
```

### WR-04: `enableThinking` only defined on Qwen3 model, creating asymmetric config

**File:** `src/data/modelConfig.js:7`
**Issue:** Only the `qwen3-0.6b` model entry has `enableThinking: false`. The active model `gemma4-e2b` does not define it. In `modelAdapter.js:6`, the check `MODEL_CONFIG.enableThinking !== undefined` correctly guards against setting the property when it is absent, and `transformersJsAdapter.js:130` also checks `this._enableThinking !== undefined`. So this is not a bug today. However, if someone switches to Qwen3 and back, or if a new model is added copying the Gemma config shape, the asymmetry could cause confusion. Each model should explicitly declare all configuration properties it supports.
**Fix:** Add `enableThinking` to both model configs for consistency:
```javascript
'gemma4-e2b': {
  model: 'onnx-community/gemma-4-E2B-it-ONNX',
  dtype: 'q4f16',
  device: 'webgpu',
  label: 'Gemma 4 E2B',
  enableThinking: undefined, // not applicable for this model
},
```

## Info

### IN-01: Import statement after function declaration breaks conventional ordering

**File:** `src/hooks/useReranker.js:38`
**Issue:** The `import { TRACKING_CONFIG }` and `import { logger }` statements at lines 38-39 appear after the `buildSyntheticProfile` function declaration (lines 17-37). While JavaScript hoists imports so this works correctly, it breaks the convention of placing all imports at the top of the file. This makes it easy to miss these dependencies when scanning the file.
**Fix:** Move lines 38-39 to the top of the file, after line 15 (the last import block).

### IN-02: Empty catch blocks swallow errors silently

**File:** `src/hooks/useReranker.js:60,154`
**Issue:** Two bare `catch` blocks at lines 60 and 154 swallow all errors with only a comment "Silent fallback" / "Silent error handling". While this matches the project convention documented in CLAUDE.md, these are the outermost error boundaries of the LLM pipeline. If an unexpected error type occurs (e.g., a TypeError from a code change), it will be completely invisible. At minimum, a `console.warn` in these blocks would aid debugging during development.
**Fix:** Add minimal logging:
```javascript
} catch (err) {
  logger.warn('reranker', `pre-ranking fallito: ${err.message}`)
}
```

### IN-03: `backendConfig` and `sharedConfig` both receive `MODEL_CONFIG`

**File:** `src/lib/modelAdapter.js:5`
**Issue:** `TransformersJsAdapter` is constructed with `(MODEL_CONFIG, MODEL_CONFIG)` -- the same object passed as both `backendConfig` (for model/dtype/device) and `sharedConfig` (for temperature/top_p/max_tokens). The adapter constructor stores them separately (`this.sharedConfig`), which is correct since they access different properties. However, passing the same object twice is slightly confusing for readability. This is a minor style observation and not a bug.
**Fix:** No change required -- the current approach works because `MODEL_CONFIG` contains both backend and shared properties via the spread. A comment could clarify the intent:
```javascript
// MODEL_CONFIG contains both backend (model/dtype/device) and shared (temperature/top_p/max_tokens) fields
const adapter = new TransformersJsAdapter(MODEL_CONFIG, MODEL_CONFIG)
```

---

_Reviewed: 2026-04-14T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

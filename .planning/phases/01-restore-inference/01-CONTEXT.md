# Phase 1: Restore Inference - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the broken LLM inference pipeline so products dynamically reorder based on user browsing behavior again. The chat_template regression must be resolved and end-to-end reranking verified.

</domain>

<decisions>
## Implementation Decisions

### Working Tree Changes
- **D-01:** Inspect all 7 modified files (modelConfig.js, useReranker.js, transformersJsAdapter.js, modelAdapter.js, promptBuilder.js, responseParser.js, vite.config.js) by reading diffs before making any changes. Decide per-file whether to keep, discard, or modify.
- **D-02:** No prior assumptions about which changes are good or bad — evaluate all diffs equally without bias.

### Template Fix Strategy
- **D-03:** Generic solution — auto-detect missing `chat_template` on tokenizer after load. If null, fetch the `.jinja` template file from HuggingFace Hub and inject it. Must work for any ONNX model, not just Gemma 4 E2B.
- **D-04:** On template fetch failure (offline, 404, network error): show clear error in UI and disable AI inference. No silent degradation, no bundled fallback strings.

### Verification
- **D-05:** Verify against all 4 roadmap success criteria: (1) no console errors related to chat_template/tokenizer, (2) grid visibly reorders after 10-15s browsing, (3) AIReasoningPanel shows updated weights and parsed LLM response, (4) reordering persists across page reload via saved weights.
- **D-06:** Test only the active model (Gemma 4 E2B). Qwen3 0.6B testing deferred to Phase 4 settings page.

### Claude's Discretion
- Template fetch implementation details (URL construction, caching, retry logic)
- Error message wording and UI placement for template fetch failures
- Which working tree changes to keep vs discard (after inspecting diffs)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Inference Pipeline
- `src/lib/adapters/transformersJsAdapter.js` — Adapter with `apply_chat_template()` call at line 105 (the crash site)
- `src/data/modelConfig.js` — Model registry with Gemma 4 E2B and Qwen3 0.6B definitions
- `src/lib/modelAdapter.js` — Factory that creates adapter from MODEL_CONFIG
- `src/lib/promptBuilder.js` — Builds 4-message chat format (system + few-shot + user) in Italian

### Scoring & Reranking
- `src/lib/responseParser.js` — Line-based parser with JSON fallback, weight clamping
- `src/lib/colorFamilies.js` — Color weight propagation (family/shade/adjacent)
- `src/lib/reranker.js` — Scoring formula: (color×40 + style×20 + category×30 + stock×5) × confidence
- `src/hooks/useReranker.js` — Dual-flow orchestrator (Flow A: inference ~2s, Flow B: reorder 1s idle)

### Known Issues
- `.planning/codebase/CONCERNS.md` — Known bugs, tech debt, and fragile areas relevant to inference pipeline

### Scoring Documentation
- `docs/SCORING_FLOW.md` — Full flow documentation with formulas and tables

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TransformersJsAdapter` class: already has load/generate/dispose lifecycle, progress reporting, device detection
- `modelAdapter.js` factory: clean separation between config and adapter creation
- `logger` module: phase-tagged logging for all pipeline stages (track/trigger/llm/parse/reorder/model)
- `useModelLoader` hook: worker lifecycle with retry (max 2), timeout (30s), progress reporting

### Established Patterns
- Model loads in Web Worker (`modelWorker.js`), UI thread isolated
- Adapter pattern: `TransformersJsAdapter` implements load/generate/dispose interface
- Config via static import from `modelConfig.js` (REFAC-04 in Phase 3 will parameterize this)
- Italian-language prompts and UI strings throughout

### Integration Points
- `transformersJsAdapter.js:105` — `apply_chat_template()` is the crash site, fix goes here or in load()
- `modelWorker.js` — Worker receives model config, creates adapter, exposes generate
- `useReranker.js` — Consumes generate callback from useModelLoader, orchestrates full pipeline
- `App.jsx` — Manages appState transitions (loading → model_loading → browsing)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for the template fix implementation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-restore-inference*
*Context gathered: 2026-04-14*

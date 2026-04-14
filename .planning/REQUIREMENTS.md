# Requirements: DynamicPLP Stabilization & Polish

**Defined:** 2026-04-14
**Core Value:** The PLP must dynamically reorder products based on user behavior, powered by a local LLM, in a way that is visually convincing and reliable enough to sell the concept.

## v1 Requirements

### Inference Fix

- [ ] **INFER-01**: Fix chat_template regression — fetch `.jinja` template file and inject onto tokenizer when `tokenizer.chat_template` is null after load
- [ ] **INFER-02**: Verify end-to-end inference produces valid ranked output (LLM generates parseable response, weights applied, products reorder)

### Dead Code Removal

- [ ] **CLEAN-01**: Remove `sandbox.html` and its Vite multi-entry rollup config atomically
- [ ] **CLEAN-02**: Remove `webLlmAdapter.js` (imports non-existent `@mlc-ai/web-llm` dependency)
- [ ] **CLEAN-03**: Remove `.playwright-mcp/` directory (untracked test tooling)

### Code Review & Refactor

- [ ] **REFAC-01**: Run full code scan identifying bugs, security issues, and quality problems
- [ ] **REFAC-02**: Execute targeted refactor based on review findings
- [ ] **REFAC-03**: Refactor `modelConfig.js` to pure registry pattern (data-only, no side effects)
- [ ] **REFAC-04**: Parameterize worker and adapter to accept config via message instead of static import

### Settings Page

- [ ] **SETT-01**: Hidden settings page accessible via keyboard shortcut and footer link (no router)
- [ ] **SETT-02**: Model selector dropdown with 3-5 curated ONNX models
- [ ] **SETT-03**: Model hot-swap via worker terminate + recreate (WebGPU memory safety)
- [ ] **SETT-04**: Active model status display (name, loading state, device info)

## v2 Requirements

### Settings Enhancements

- **SETT-05**: Inference parameter sliders (temperature, top_p, max_tokens)
- **SETT-06**: Live inference test button from settings page
- **SETT-07**: Custom model ID input field for arbitrary HuggingFace models
- **SETT-08**: Per-model default parameters auto-loaded on selection
- **SETT-09**: WebGPU/WASM device capability info display

### Robustness

- **ROBU-01**: Per-model prompt format adaptation (handle models that don't support Italian prompts)
- **ROBU-02**: Structured output quality validation per model (detect when a model can't follow the format)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud/API model support (OpenAI, Anthropic) | Contradicts local-first selling point |
| React Router integration | Over-engineering for single hidden page in a PoC |
| Persistent settings across sessions | Session-only is cleaner for demo scenarios |
| HuggingFace Hub search/browse | Too complex for PoC; curated list sufficient |
| TypeScript migration | Too much churn for stabilization milestone |
| Mobile-specific optimizations | Desktop demo is primary target |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFER-01 | Phase 1 | Pending |
| INFER-02 | Phase 1 | Pending |
| CLEAN-01 | Phase 2 | Pending |
| CLEAN-02 | Phase 2 | Pending |
| CLEAN-03 | Phase 2 | Pending |
| REFAC-01 | Phase 3 | Pending |
| REFAC-02 | Phase 3 | Pending |
| REFAC-03 | Phase 3 | Pending |
| REFAC-04 | Phase 3 | Pending |
| SETT-01 | Phase 4 | Pending |
| SETT-02 | Phase 4 | Pending |
| SETT-03 | Phase 4 | Pending |
| SETT-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after roadmap phase mapping*

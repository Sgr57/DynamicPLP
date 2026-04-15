# Roadmap: DynamicPLP Stabilization & Polish

## Overview

The app's LLM inference pipeline is broken. This roadmap restores it, cleans up dead code, improves quality through targeted refactoring, and delivers a hidden settings page for model selection. Each phase builds on the previous: fix the core, clean the noise, refactor for quality, then add the settings capability. The result is a demo-ready PoC with swappable models.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Restore Inference** - Fix chat_template regression and verify end-to-end LLM-driven reranking works
- [ ] **Phase 2: Dead Code Removal** - Remove sandbox page, dead adapter, and untracked test tooling
- [ ] **Phase 3: Code Review & Refactor** - Scan for quality issues and execute targeted fixes including model config cleanup
- [ ] **Phase 4: Settings Page** - Hidden settings page with model selector, hot-swap, and status display

## Phase Details

### Phase 1: Restore Inference
**Goal**: Users see products dynamically reorder based on their browsing behavior again
**Depends on**: Nothing (first phase)
**Requirements**: INFER-01, INFER-02
**Success Criteria** (what must be TRUE):
  1. The app loads without console errors related to chat_template or tokenizer
  2. After browsing for 10-15 seconds (hovering, clicking products), the product grid visibly reorders
  3. The AIReasoningPanel (debug overlay) shows updated weights and a parsed LLM response
  4. Reordering persists across page reloads (pre-personalized startup from saved weights)
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Fix chat_template regression, evaluate working tree diffs, verify end-to-end reranking

### Phase 2: Dead Code Removal
**Goal**: The codebase contains only code that serves the running application
**Depends on**: Phase 1
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. `sandbox.html` does not exist and `npm run build` produces a single-entry bundle without errors
  2. No import references to `@mlc-ai/web-llm` or `webLlmAdapter` exist anywhere in the codebase
  3. The `.playwright-mcp/` directory does not exist in the project root
**Plans**: TBD

Plans:
- [ ] 02-01: TBD

### Phase 3: Code Review & Refactor
**Goal**: Known quality issues are identified and fixed, and the model config is ready for multi-model support
**Depends on**: Phase 2
**Requirements**: REFAC-01, REFAC-02, REFAC-03, REFAC-04
**Success Criteria** (what must be TRUE):
  1. A documented code review exists listing all identified bugs, security issues, and quality problems
  2. All critical and high-priority findings from the review are resolved
  3. `modelConfig.js` exports a pure data registry (no side effects, no imports of runtime modules)
  4. The web worker accepts model configuration via message payload rather than static import
  5. The app still reranks products correctly after all refactoring (no regressions)
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Settings Page
**Goal**: Users can select and swap LLM models from a hidden settings interface
**Depends on**: Phase 3
**Requirements**: SETT-01, SETT-02, SETT-03, SETT-04
**Success Criteria** (what must be TRUE):
  1. A keyboard shortcut and a footer link both open the settings page (no URL routing involved)
  2. The settings page shows a dropdown with 3-5 selectable ONNX models
  3. Selecting a different model terminates the current worker, loads the new model, and inference resumes without page reload
  4. The settings page displays the active model name, its loading/ready state, and WebGPU device info
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 04-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Restore Inference | 0/1 | Planning complete | - |
| 2. Dead Code Removal | 0/0 | Not started | - |
| 3. Code Review & Refactor | 0/0 | Not started | - |
| 4. Settings Page | 0/0 | Not started | - |

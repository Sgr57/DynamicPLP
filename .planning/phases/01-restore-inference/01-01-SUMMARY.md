---
phase: 01-restore-inference
plan: 01
subsystem: ai
tags: [transformers-js, gemma4, chat-template, webgpu, reranking]

requires: []
provides:
  - Working LLM inference pipeline (tracking → prompt → model → parse → rerank → grid reorder)
  - Chat template auto-injection for models shipping .jinja separately
  - Multi-model config registry (MODELS + ACTIVE_MODEL)
  - Simplified 6-line prompt/response format
  - Synthetic profile builder from LLM weights
affects: [02-cleanup, 03-hardening, 04-settings]

tech-stack:
  added: []
  patterns:
    - "Chat template auto-fetch from HuggingFace Hub when missing from tokenizer_config.json"
    - "AutoModelForCausalLM generic model loading (not model-specific class)"
    - "Synthetic profile construction from weight entries instead of LLM-generated PROFILE line"

key-files:
  created: []
  modified:
    - src/lib/adapters/transformersJsAdapter.js
    - src/data/modelConfig.js
    - src/lib/modelAdapter.js
    - src/lib/promptBuilder.js
    - src/lib/responseParser.js
    - src/hooks/useReranker.js

key-decisions:
  - "Keep all 6 working tree diffs (modelConfig, adapter, modelAdapter, promptBuilder, responseParser, useReranker) — research confirmed each is sound"
  - "Revert vite.config.js sandbox.html entry — wrong direction, sandbox removal is Phase 2"
  - "Generic chat_template fetch (not Gemma-specific) — works for any model with separate .jinja"
  - "PROFILE line removed from prompt/parser — synthetic profile built from weights instead"

patterns-established:
  - "Multi-model registry: MODELS object + ACTIVE_MODEL selector in modelConfig.js"
  - "Chat template auto-injection: fetch .jinja from HuggingFace Hub if tokenizer lacks it"
  - "6-line response format: COLOR, STYLE, CATEGORY, CONFIDENCE, INTENT, MESSAGE"

requirements-completed: [INFER-01, INFER-02]

duration: ~15min
completed: 2026-04-15
---

# Phase 1: Restore Inference Summary

**Fixed Gemma 4 E2B chat_template regression with auto-injection from HuggingFace Hub, simplified prompt to 6-line format, added multi-model config registry**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-14
- **Completed:** 2026-04-15
- **Tasks:** 2 (1 implementation + 1 human-verify)
- **Files modified:** 6 (+ 1 reverted)

## Accomplishments
- Chat template auto-injection: detects missing `chat_template` on tokenizer, fetches `.jinja` from HuggingFace Hub, injects before model load
- Multi-model config registry with `MODELS` object and `ACTIVE_MODEL` selector
- Simplified 6-line prompt format (removed PROFILE line, shorter instructions)
- Synthetic profile builder from top weight entries in useReranker
- All 4 roadmap success criteria verified by human in Chrome with WebGPU

## Task Commits

Each task was committed atomically:

1. **Task 1: Evaluate working tree diffs, add chat_template auto-injection, stage all changes** - `4da5bb2` (feat)
2. **Task 2: Verify end-to-end inference and reranking** - Human-verified (no code changes)

## Files Created/Modified
- `src/lib/adapters/transformersJsAdapter.js` - Chat template auto-injection in load(), AutoModelForCausalLM, conditional enable_thinking
- `src/data/modelConfig.js` - Multi-model MODELS registry with ACTIVE_MODEL selector
- `src/lib/modelAdapter.js` - enableThinking passthrough from config to adapter
- `src/lib/promptBuilder.js` - Simplified 6-line format (no PROFILE line)
- `src/lib/responseParser.js` - PROFILE prefix removed, JSDoc updated to 6-line format
- `src/hooks/useReranker.js` - buildSyntheticProfile from weights, saves as user_profile
- `vite.config.js` - Reverted to committed state (removed sandbox.html multi-entry)

## Decisions Made
- Kept all 6 working tree diffs after research evaluation confirmed each is sound
- Reverted vite.config.js — sandbox.html is Phase 2 cleanup target, not build config
- Used generic chat_template detection (not Gemma-specific) for future model compatibility
- Removed PROFILE from LLM response format — synthetic profile from weights is more reliable with small models

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Inference pipeline fully working — Phase 2 (cleanup) can proceed
- sandbox.html flagged for removal in Phase 2 (CLEAN-01)
- Multi-model registry ready for Phase 4 (settings UI)

---
*Phase: 01-restore-inference*
*Completed: 2026-04-15*

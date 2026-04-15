# DynamicPLP — Stabilization & Polish

## What This Is

AI-powered Product Listing Page for shoe e-commerce that personalizes product order in real-time using an LLM running entirely in the browser. Local-first PoC built with React, TinyBase, and Transformers.js. Must work smoothly and convincingly for sales demos.

## Core Value

The PLP must dynamically reorder products based on user behavior, powered by a local LLM, in a way that is visually convincing and reliable enough to sell the concept.

## Requirements

### Validated

- ✓ Product grid with real-time reordering via Framer Motion — existing
- ✓ Event-driven tracking (hover, click, scroll, drawer) with anti-accidental filters — existing
- ✓ Dual-flow orchestrator: LLM inference (~2s) + reorder on idle (1s) — existing
- ✓ Prompt builder with Italian system prompt, event log, few-shot examples — existing
- ✓ Response parser (line-based + JSON fallback) with weight clamping — existing
- ✓ Color propagation (family/shade/adjacent relationships) — existing
- ✓ Confidence-weighted reranking formula — existing
- ✓ Pre-personalized startup from saved weights — existing
- ✓ TinyBase + IndexedDB auto-persistence — existing
- ✓ Product drawer with variant cycling and tracking — existing
- ✓ Debug overlay (AIReasoningPanel) — existing
- ✓ Service Worker offline support — existing
- ✓ Fix LLM chat_template regression — Validated in Phase 1: Restore Inference

### Active

- [ ] Remove sandbox page and all related unused code
- [ ] Code scan and review for quality issues
- [ ] Targeted refactor based on review findings
- [ ] Hidden settings page for LLM selection (swap models, custom fine-tuned)

### Out of Scope

- New features beyond LLM settings — stabilization milestone, not feature expansion
- Backend/API integration — local-first architecture is the selling point
- TypeScript migration — too much churn for a PoC stabilization pass
- Mobile-specific optimizations — desktop demo is primary target

## Context

- Brownfield codebase, already mapped (`.planning/codebase/`)
- LLM inference restored (Phase 1) — chat_template auto-injection from HuggingFace Hub, multi-model config registry, simplified 6-line prompt format
- `sandbox.html` is an untracked test page with possible dead code dependencies
- Reference project for LLM settings page: `/Users/emanuele/Projects/CompareLocalLLM`
- Stack: React 18 + Vite 5 + Tailwind 3 + Framer Motion 11 + TinyBase 5 + @huggingface/transformers 4.0.1
- Model adapter pattern already exists (`src/lib/adapters/transformersJsAdapter.js`) — good foundation for multi-model support
- Phase 1 complete: all 7 working tree diffs evaluated, 6 kept, vite.config.js reverted

## Constraints

- **PoC quality**: Must be convincing for demos, not production-hardened
- **Local-first**: No backend, all data stays on device
- **WebGPU**: Primary inference target (WASM fallback exists)
- **JavaScript only**: No TypeScript in this codebase
- **Browser**: Chrome 113+ required for WebGPU

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hidden settings page (not main nav) | LLM selection is a power-user/demo feature, not end-user facing | — Pending |
| Use CompareLocalLLM as reference | User has working LLM selector pattern in another project | — Pending |
| Refactor after review, not before | Need data (code review findings) to drive targeted refactor | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-15 after Phase 1 completion*

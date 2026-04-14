# Phase 1: Restore Inference - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 01-restore-inference
**Areas discussed:** Working tree changes, Template fix scope, Verification depth

---

## Working Tree Changes

| Option | Description | Selected |
|--------|-------------|----------|
| Inspect and decide | Read diffs first, decide per-file what to keep vs discard | ✓ |
| Discard all, start fresh | git checkout all modified files, build fix from clean baseline | |
| Keep all as starting point | Treat existing changes as intentional progress | |

**User's choice:** Inspect and decide
**Notes:** No hints about specific files — all diffs evaluated equally without bias.

| Option | Description | Selected |
|--------|-------------|----------|
| No hints, inspect all equally | Let researcher evaluate each diff without bias | ✓ |
| I have context to share | Describe remembered changes | |

**User's choice:** No hints, inspect all equally

---

## Template Fix Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Generic solution | Auto-detect missing chat_template for any model, fetch .jinja from HF Hub | ✓ |
| Minimal fix for Gemma only | Hardcode Gemma 4 E2B template as fallback string | |
| You decide | Claude picks based on effort vs payoff | |

**User's choice:** Generic solution
**Notes:** Future-proofs for Phase 4 settings page where users swap models.

| Option | Description | Selected |
|--------|-------------|----------|
| Error + disable AI | Show clear error in UI, disable inference, no silent degradation | ✓ |
| Bundled fallback template | Ship hardcoded template for default model as second fallback | |
| You decide | Claude picks based on offline-first constraints | |

**User's choice:** Error + disable AI
**Notes:** No silent degradation on template fetch failure.

---

## Verification Depth

| Option | Description | Selected |
|--------|-------------|----------|
| All 4 success criteria | Methodically check all roadmap success criteria | ✓ |
| Quick smoke test | Browse a few products, confirm grid moves | |
| You decide | Claude picks based on fix complexity | |

**User's choice:** All 4 success criteria

| Option | Description | Selected |
|--------|-------------|----------|
| Active model only (Gemma) | Verify Gemma 4 E2B end-to-end, defer Qwen3 | ✓ |
| Both models | Test both by switching ACTIVE_MODEL | |

**User's choice:** Active model only (Gemma)
**Notes:** Qwen3 testing deferred to Phase 4 settings page.

---

## Claude's Discretion

- Template fetch implementation details (URL construction, caching, retry)
- Error message wording and UI placement
- Per-file keep/discard decisions after inspecting working tree diffs

## Deferred Ideas

None.

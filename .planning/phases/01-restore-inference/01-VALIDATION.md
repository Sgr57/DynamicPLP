---
phase: 1
slug: restore-inference
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Browser manual + console verification (no test framework in project) |
| **Config file** | none — no test framework configured |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run preview` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run preview`
- **Before `/gsd-verify-work`:** Full build must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFER-01 | — | N/A | build | `npm run build` | ✅ | ⬜ pending |
| 01-01-02 | 01 | 1 | INFER-01 | — | N/A | build | `npm run build` | ✅ | ⬜ pending |
| 01-01-03 | 01 | 1 | INFER-02 | — | N/A | build+manual | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — Phase 1 is a fix/restore phase verified by build success and manual browser testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Product grid reorders after browsing | INFER-02 | Requires real browser interaction + WebGPU | 1. Open app in Chrome 113+, 2. Hover/click products for 10-15s, 3. Observe grid reorder |
| AIReasoningPanel shows weights | INFER-02 | UI visual verification | Check debug overlay displays parsed LLM weights |
| Reordering persists on reload | INFER-02 | Requires IndexedDB state | Reload page, verify products stay reordered |
| No chat_template console errors | INFER-01 | Console inspection | Open DevTools, verify no tokenizer/chat_template errors |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

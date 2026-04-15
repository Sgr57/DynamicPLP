---
phase: 01-restore-inference
verified: 2026-04-14T00:00:00Z
status: human_needed
score: 5/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open Chrome 113+ at the dev server URL after running `npm run dev`. Open DevTools Console (Cmd+Option+J). Wait for model to finish loading. Filter console for 'chat_template' and 'tokenizer'. Check Network tab for a 200 response to `https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/resolve/main/chat_template.jinja`."
    expected: "No errors in console containing 'chat_template' or 'tokenizer'. Network tab shows 200 for chat_template.jinja fetch."
    why_human: "Requires live browser with network access to HuggingFace Hub. The code path exists (verified), but CORS behavior on .jinja files and actual network success cannot be confirmed programmatically. This is also ROADMAP SC1."

  - test: "After model loads (progress bar completes, status shows 'browsing'), hover over several products for 1-2 seconds each, click a few to open drawers. Focus on one color/style for 10-15 seconds. Observe the product grid."
    expected: "Product grid visibly reorders — products matching the browsed pattern move toward the top."
    why_human: "Requires live WebGPU inference in Chrome. The dual-flow orchestrator, trigger engine, LLM pipeline, and reranker are all wired (verified), but actual model output quality and visible reordering cannot be confirmed without running inference. This is ROADMAP SC2."

  - test: "Look at the sticky AIReasoningPanel on the right side after the first LLM analysis completes (isAnalyzing state cycles). Open the debug panel."
    expected: "Panel shows non-empty color_weights, style_weights, category_weights, confidence score (0-1), intent (exploring/deciding/focused), and an Italian-language message."
    why_human: "Requires live LLM output. The panel polls aiMemoryRepo every 3s and renders weights via WeightBars — all wiring confirmed — but actual parsed output content depends on real model inference. This is ROADMAP SC3."

  - test: "After products have reordered at least once, hard-refresh the page (Cmd+Shift+R). Observe the product order immediately on load."
    expected: "Product grid loads in the last known reranked order before the model even starts loading. The pre-personalized startup effect is visible."
    why_human: "Requires prior session with saved weights in IndexedDB. The pre-ranking useEffect on mount code exists and is wired to getWeights()/rankProducts()/updatePositions() (all verified). Confirming visible persistence requires a live session. This is ROADMAP SC4."
---

# Phase 1: Restore Inference — Verification Report

**Phase Goal:** Users see products dynamically reorder based on their browsing behavior again
**Verified:** 2026-04-14
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App loads without console errors related to chat_template or tokenizer | ? HUMAN NEEDED | Code path complete: null check at line 69, fetch from HuggingFace Hub at line 70, injection at line 74. Cannot confirm CORS/network success or absence of runtime errors without live browser. |
| 2 | After browsing 10-15 seconds, the product grid visibly reorders | ? HUMAN NEEDED | Full pipeline wired: Flow A triggers every 2s, generate() calls model worker, parseResponse() extracts weights, propagateColorWeights() applies families, rankProducts() scores, updatePositions() writes, Flow B applies on 1s idle. All code verified substantive. Requires live WebGPU inference to confirm. |
| 3 | AIReasoningPanel shows updated weights and a parsed LLM response | ? HUMAN NEEDED | Panel polls aiMemoryRepo every 3s (line 114 in AIReasoningPanel), renders via WeightBars (lines 305-307). weights.message saved to aiMemory and rendered via lastMessage prop (lines 149, 202-204). All wiring confirmed. Requires live LLM output to confirm non-empty values. |
| 4 | Reordering persists across page reloads via saved weights in aiMemory | ? HUMAN NEEDED | Pre-ranking useEffect on mount (lines 52-64 in useReranker.js): getWeights() -> rankProducts() -> updatePositions() -> setProducts(). saveWeights() called in Flow A after each inference cycle (line 131). All wiring confirmed. Requires live session with IndexedDB data to confirm. |

**Score:** 0/4 roadmap truths independently verifiable (all require live browser with WebGPU)

### Required Artifacts

All PLAN frontmatter artifacts verified against actual codebase. None are missing or stub implementations.

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/adapters/transformersJsAdapter.js` | Chat template auto-injection in load() | VERIFIED | `if (!this.tokenizer.chat_template)` at line 69; fetch URL at line 70; `this.tokenizer.chat_template = await response.text()` at line 74. AutoModelForCausalLM used (line 3). Substantive: 168 lines, full load/generate/dispose lifecycle. |
| `src/data/modelConfig.js` | Multi-model registry with MODELS and ACTIVE_MODEL | VERIFIED | `const MODELS = {` at line 1 with qwen3-0.6b and gemma4-e2b entries; `const ACTIVE_MODEL = 'gemma4-e2b'` at line 18. Data-only, no side effects. |
| `src/lib/modelAdapter.js` | enableThinking passthrough to adapter._enableThinking | VERIFIED | `adapter._enableThinking = MODEL_CONFIG.enableThinking` at line 7, conditional on undefined check. |
| `src/lib/promptBuilder.js` | Simplified 6-line response format (no PROFILE line) | VERIFIED | `Rispondi SOLO con 6 righe` at line 17. No PROFILE in SYSTEM_PROMPT or FEWSHOT_ASSISTANT. FEWSHOT_ASSISTANT uses 6-line format. |
| `src/lib/responseParser.js` | Parser without PROFILE prefix (matching 6-line format) | VERIFIED | LINE_PREFIXES object has exactly 6 keys: COLOR, STYLE, CATEGORY, CONFIDENCE, INTENT, MESSAGE. No PROFILE anywhere in file. JSDoc documents 6-line format. |
| `src/hooks/useReranker.js` | Synthetic profile builder from weights | VERIFIED | `function buildSyntheticProfile(weights)` at line 17; called at line 134; result saved via `setMemoryValue('user_profile', synthProfile)` at line 136. |
| `vite.config.js` | Clean single-entry Vite config (no sandbox.html) | VERIFIED | No 'sandbox' references. Single-entry config with optimizeDeps.exclude, worker.format, COOP/COEP headers, VitePWA plugin. Build succeeds (exit 0). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `transformersJsAdapter.js` | `https://huggingface.co/{modelId}/resolve/main/chat_template.jinja` | `fetch()` in load() after AutoTokenizer.from_pretrained() | WIRED | `fetch(templateUrl)` at line 72 after tokenizer load completes. URL constructed at line 70. |
| `transformersJsAdapter.js` | `tokenizer.chat_template` | assignment after successful fetch | WIRED | `this.tokenizer.chat_template = await response.text()` at line 74 inside `if (response.ok)` block. |
| `modelAdapter.js` | `transformersJsAdapter.js` | createModelAdapter() passes enableThinking via adapter._enableThinking | WIRED | `adapter._enableThinking = MODEL_CONFIG.enableThinking` at line 7. Conditional on `!== undefined`. |
| `promptBuilder.js` | `responseParser.js` | 6-line format (COLOR/STYLE/CATEGORY/CONFIDENCE/INTENT/MESSAGE) matches LINE_PREFIXES | WIRED | promptBuilder format spec lines match exactly: COLOR, STYLE, CATEGORY, CONFIDENCE, INTENT, MESSAGE. Parser regex `replace(/^[:\s]+/, '')` handles both colon and space-separated values (verified in research). |
| `useReranker.js` | `aiMemoryRepo.js` | buildSyntheticProfile() output saved as user_profile | WIRED | `setMemoryValue('user_profile', synthProfile)` at line 136 after profile is built at line 134. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `useReranker.js` → Flow A | `weights` | `await generate(messages)` → `parseResponse(text, getWeights())` | Yes — actual LLM inference output; parseResponse extracts real weight values | VERIFIED (code path) / HUMAN NEEDED (runtime) |
| `useReranker.js` → Flow B | `orderedIds` | `rankProducts(getProducts(), getWeights())` | Yes — scores products using stored weights from aiMemory | VERIFIED (code path) |
| `useReranker.js` → pre-ranking | `orderedIds` | `rankProducts(getProducts(), getWeights())` on mount | Yes — uses last persisted weights from IndexedDB via getWeights() | VERIFIED (code path) |
| `AIReasoningPanel.jsx` | `weights`, `confidence`, `intent` | `getWeights()` / `getMemoryValue()` polled every 3s | Yes — reads from TinyBase aiMemory table after LLM writes | VERIFIED (code path) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Production build succeeds | `npm run build` | Exit 0, dist/assets/index-*.js + sw.js built | PASS |
| vite.config.js reverted (no sandbox) | `git diff --name-only vite.config.js \| wc -l` | 0 | PASS |
| chat_template.jinja URL in adapter | grep | Found at line 70 | PASS |
| PROFILE removed from responseParser | grep | 0 occurrences | PASS |
| buildSyntheticProfile defined and called | grep | Defined line 17, called line 134, saves line 136 | PASS |
| ACTIVE_MODEL selector in modelConfig | grep | `const ACTIVE_MODEL = 'gemma4-e2b'` at line 18 | PASS |
| 6-line format in promptBuilder | grep | `Rispondi SOLO con 6 righe` at line 17 | PASS |
| Live inference (requires WebGPU/browser) | N/A | SKIPPED — requires live browser with WebGPU | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFER-01 | 01-01-PLAN.md | Fix chat_template regression — fetch `.jinja` template file and inject onto tokenizer when `tokenizer.chat_template` is null after load | SATISFIED (code) / HUMAN NEEDED (runtime) | Null check at line 69, fetch at line 70-88 in transformersJsAdapter.js. Error handling per D-04 (throws on 404/network error, propagates to useModelLoader). Fetch from HuggingFace Hub standard URL. |
| INFER-02 | 01-01-PLAN.md | Verify end-to-end inference produces valid ranked output (LLM generates parseable response, weights applied, products reorder) | HUMAN NEEDED | Full pipeline wired. Requires live WebGPU browser verification against 4 success criteria per D-05. Cannot be confirmed programmatically — no automated test framework exists (documented in RESEARCH.md). |

No orphaned requirements: REQUIREMENTS.md maps INFER-01 and INFER-02 to Phase 1, and both appear in 01-01-PLAN.md's `requirements` field.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | No TODOs, FIXMEs, stubs, or empty returns in modified files. |

### Human Verification Required

All 4 ROADMAP success criteria require a live browser with Chrome 113+ (WebGPU) to confirm. The implementation is complete and all code paths are wired — what follows is the runtime confirmation checklist.

#### 1. Chat Template Fetch (SC1 + INFER-01 runtime)

**Test:** Run `npm run dev`. Open Chrome 113+ at the dev server URL. Open DevTools Console and Network tab. Wait for model to fully load (progress bar completes, `[PLP] model | Modello pronto!` in console or similar). Filter console for "chat_template" and "tokenizer".
**Expected:** Zero errors. Network tab shows a 200 response to `https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/resolve/main/chat_template.jinja`.
**Why human:** CORS behavior on .jinja files from HuggingFace Hub is assumed (documented as A1 in RESEARCH.md). The code path is correct but CORS can only be confirmed with a live browser request.

#### 2. Grid Reordering After Browsing (SC2 + INFER-02 partial)

**Test:** After model loads, hover over products for 1-2 seconds each and click a few. Focus on one style/color for 10-15 seconds. Observe the product grid.
**Expected:** Products visibly reorder — items matching the browsed pattern (e.g., rosso, flat) move toward the top.
**Why human:** Requires WebGPU inference to produce actual LLM output. The full pipeline is wired but reordering depends on the model generating a parseable 6-line response.

#### 3. AIReasoningPanel Shows Weights and LLM Response (SC3)

**Test:** After the first LLM analysis (isAnalyzing cycles from true to false), open the debug panel in AIReasoningPanel.
**Expected:** Panel shows non-empty color weights, style weights, category weights, a confidence score, an intent label (exploring/deciding/focused), and an Italian-language message.
**Why human:** Panel content depends on actual parsed LLM output written to aiMemory. All rendering code is wired and confirmed.

#### 4. Pre-Personalized Startup Persists Across Reload (SC4)

**Test:** After at least one LLM analysis and reranking cycle, hard-refresh the page (Cmd+Shift+R). Observe product order immediately on load.
**Expected:** Products appear in the last known ranked order before the model even starts loading.
**Why human:** Requires prior session with weights in IndexedDB. Pre-ranking on mount is code-verified but requires a live IndexedDB state to confirm visual persistence.

### Gaps Summary

No code gaps found. All 7 plan artifacts exist, are substantive, and are correctly wired. The production build succeeds. The phase is blocked on human runtime verification only — specifically ROADMAP success criteria SC1-SC4 which require a Chrome 113+ browser with WebGPU.

The only remaining risk before marking SC1 as passed is the CORS assumption for `.jinja` files from HuggingFace Hub (documented as assumption A1 in RESEARCH.md). If CORS blocks the fetch, the error will surface via D-04's error propagation path (useModelLoader sets status='error'), and the failure mode is visible rather than silent.

---

_Verified: 2026-04-14_
_Verifier: Claude (gsd-verifier)_

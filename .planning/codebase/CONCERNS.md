# Codebase Concerns

**Analysis Date:** 2026-04-14

## Tech Debt

### Silent Error Handling Throughout Pipeline

**Issue:** The codebase uses excessive silent error handling (empty catch blocks with `catch (_) { }` or `catch { }`) without logging, which masks failures and makes debugging difficult.

**Files:**
- `src/tracking/trackingEngine.js` - Lines 19, 25, 45, 82, 124, 136
- `src/hooks/useReranker.js` - Lines 60, 88, 119, 154
- `src/App.jsx` - Lines 51, 87

**Impact:** 
- Production bugs go undetected when tracker events fail to insert
- Color propagation failures are swallowed
- Product reordering fails silently with no visibility
- Difficult to diagnose user issues in field

**Fix approach:** Replace silent catches with proper error logging. At minimum, use `logger.warn()` to capture all error conditions. Consider categorizing errors (recoverable vs critical).

### Bare Exception Handling Without Type Checking

**Issue:** Most error handlers don't verify error type before accessing `.message`, which can fail if non-Error objects are thrown.

**Files:**
- `src/hooks/useModelLoader.js` - Lines 72, 84, 124 (assumes error has `.message`)
- `src/lib/adapters/transformersJsAdapter.js` - Lines 130-134 (catch during dispose)

**Impact:** Edge case failures during error handling itself could cause silent crashes

**Fix approach:** Normalize error handling:
```javascript
catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  logger.error(msg)
}
```

### Hardcoded Magic Numbers and Config Scattered Across Files

**Issue:** Weights, timeouts, and thresholds are hardcoded in multiple locations instead of centralized configuration.

**Files:**
- `src/lib/reranker.js` - Lines 1-4: Weight constants (W_COLOR=40, W_STYLE=20, etc.) - should be in `trackingConfig.js`
- `src/lib/adapters/transformersJsAdapter.js` - Line 30: THROTTLE_MS=250, progress percentages (10%, 90%) are magic numbers
- `src/tracking/trackingEngine.js` - Line 115: Hard-coded 2000ms scroll skip threshold in createScrollObserver
- `src/data/modelConfig.js` - Temperature/top_p/max_tokens should be in tracking config alongside other tunable parameters

**Impact:**
- Tuning reranking requires code changes in multiple places
- Inference parameters not discoverable from config file
- Hard to A/B test different weight schemes

**Fix approach:** Create `src/lib/rerankerConfig.js` with all scoring weights. Move all inference parameters to centralized location.

## Known Bugs

### LLM Response Parser Has Incomplete Edge Case Handling

**Issue:** The response parser in `src/lib/responseParser.js` has a subtle bug in line 85 where it checks `result[partner] !== undefined && rawWeights[partner] !== undefined` for shade propagation. This condition prevents shade propagation when result already has a value from family propagation, but the intent is to only skip if the partner was explicitly set by the LLM.

**Files:** `src/lib/colorFamilies.js` - Line 85

**Symptoms:** Shade weights sometimes don't propagate fully when a family weight was applied first

**Trigger:** LLM assigns weight to base color (e.g., "blu"), then shade propagation should also weight "blu scuro", but if family propagation already added "blu scuro", the shade rule doesn't apply

**Workaround:** The bug is minor because maxPropagatedWeight caps impact, but results differ from specification

**Fix approach:** Change condition to check only `rawWeights[partner] !== undefined` — don't skip if result has value from previous propagation phase.

### Product Styles Not Validated On Load

**Issue:** In `src/db/productsRepo.js` line 11, product styles are parsed from JSON string without try-catch. If the JSON is malformed, the entire product load fails.

**Files:** `src/db/productsRepo.js` - Line 11

**Symptoms:** App fails silently if a single product has corrupted styles field

**Trigger:** Manual data edit or corrupted IndexedDB entry

**Workaround:** Use default empty array if parse fails

**Fix approach:** 
```javascript
styles: typeof p.styles === 'string' 
  ? (() => { try { return JSON.parse(p.styles) } catch { return [] } })() 
  : p.styles || []
```

## Security Considerations

### No Input Validation on Event Data

**Risk:** Event tracking accepts arbitrary string values for `color` field without validation against catalog colors. If corrupted data reaches the LLM prompt, it could cause unexpected behavior.

**Files:** `src/tracking/trackingEngine.js` - Lines 56, 66; `src/db/trackingRepo.js` - Line 10

**Current mitigation:** LLM sees invalid colors in prompt and ignores them (soft failure)

**Recommendations:** 
- Validate `color` against `ALL_CATALOG_COLORS` before inserting event
- Validate `productId` exists in products table
- Reject events with missing required fields

### IndexedDB Persistence Has No Integrity Checks

**Risk:** Corrupted IndexedDB data (e.g., weights with NaN, negative confidence) could cause NaN propagation through ranking scores.

**Files:** `src/db/store.js`, `src/db/aiMemoryRepo.js`

**Current mitigation:** Response parser clamps confidence (0-1) and weights (-1 to 1), but on load from IndexedDB there's no validation

**Recommendations:**
- Add `sanitizeWeights()` call in `getWeights()` before returning
- Validate loaded weights in `initStore()` after auto-load

### LLM Prompt Injection Risk (Low)

**Risk:** User profile text is directly concatenated into prompt without sanitization. A malicious user tracking event with crafted event text could break prompt format.

**Files:** `src/lib/promptBuilder.js` - Line 49

**Current mitigation:** Profile is built from LLM output, not user input, so risk is low

**Recommendations:**
- Still validate profile doesn't contain newlines that break format
- Consider using XML-style tags instead of plaintext concatenation

## Performance Bottlenecks

### Redundant Product Fetches in useReranker Hook

**Issue:** `useReranker` calls `getProducts()` multiple times per reorder cycle, and these are full table scans through TinyBase.

**Files:** `src/hooks/useReranker.js` - Lines 46, 56, 176, 189

**Problem:**
- Line 46: Initial state setter
- Line 56-58: Pre-ranking on mount
- Line 176-177: Reorder cycle (runs every 1s when idle)
- Line 189: Refresh after update

**Cause:** No memoization of products; each call re-fetches all products and variants from store

**Improvement path:** 
- Cache products with store subscription instead of imperative fetches
- Use TinyBase listener API to update local state only when store changes
- Reduce redundant `getProducts()` calls in pre-ranking

### Color Weight Propagation Recalculates All Colors Every Cycle

**Issue:** `propagateColorWeights()` in `src/lib/colorFamilies.js` rebuilds all propagation lookups (colorToFamily, shadePartners, adjacentMap) on every call.

**Files:** `src/lib/colorFamilies.js` - Lines 32-55

**Impact:** Runs every LLM inference cycle (every ~2s when analyzing)

**Improvement path:** Move lookups outside function as module-level constants (already statically built, just need to hoist them)

### Event Formatting Scans Full Event Table Every 2s

**Issue:** `formatEvents()` in `src/ai/eventFormatter.js` fetches ALL events, filters to last 350, and formats them on every trigger evaluation (even failures).

**Files:** `src/ai/eventFormatter.js`

**Cause:** No caching; even when shouldTrigger() returns false, formatEvents() was called first

**Improvement path:** 
- Move `formatEvents()` call into `shouldTrigger()` only if other conditions pass
- Or cache formatted event log and invalidate only when new event added

## Fragile Areas

### Drawer Product Selection When Product Removed

**Files:** `src/hooks/useReranker.js` - Lines 179-186

**Why fragile:** When reordering, code checks if `drawerProductId` exists in `orderedIds`. If the drawn product somehow gets filtered or removed, the splice could operate on wrong indices.

**Safe modification:** Add defensive check:
```javascript
const drawerIdx = orderedIds.indexOf(drawerProductId)
if (drawerIdx === -1) return  // product not in results
```

**Test coverage:** No tests for edge case where drawer product is not in product list

### Store Initialization Race Condition

**Files:** `src/App.jsx` - Lines 43-64

**Why fragile:** `initStore()` completes, then immediately `getWeights()` is called. If persister's auto-load is still in progress, pre-weights might be stale. Race condition window is small but possible.

**Safe modification:** Wait for persister promise explicitly in `initStore()`

**Test coverage:** Gaps in initialization sequencing validation

### LLM Worker Lifecycle Not Fully Isolated

**Files:** `src/lib/modelWorker.js`

**Why fragile:** Global `adapter` and `aborted` variables could have state pollution if multiple messages arrive out of order:
- If 'generate' message arrives, `aborted = false` (line 20)
- If 'abort' arrives immediately, `aborted = true` (line 29)
- Result still posts if abort check fails (line 22)

**Safe modification:** Use message-level tracking instead of global flags:
```javascript
const pendingRequests = new Map()  // id → {aborted, promise}
```

**Test coverage:** No tests for abort race conditions

## Scaling Limits

### Event Table Unbounded Growth

**Resource:** IndexedDB storage for trackingEvents table

**Current capacity:** 350 events in formatter sliding window, but DB stores all events

**Limit:** IndexedDB quota typically 50MB per origin. At ~200 bytes per event, this allows ~250k events before quota exceeded. On long-running sessions (days), users hit quota.

**Scaling path:**
- Add event TTL: delete events older than 24 hours
- Implement event table archival (move old events to separate table)
- Batch delete after analysis (keep last 500 events max)

### Model Load Retry Has Fixed Delay

**Files:** `src/hooks/useModelLoader.js` - Lines 27-99

**Issue:** After retry, immediately attempts reload. If device is temporarily low on memory, both retries fail in quick succession.

**Scaling path:** Implement exponential backoff (initial 1s, then 5s, then 30s)

## Dependencies at Risk

### @huggingface/transformers ^4.0.1 - Broad Version Range

**Risk:** Major version changes (5.0.0+) could break adapter API. Currently pinned to ^4.0.1 which allows 4.x but not 5.x.

**Files:** `package.json` - Line 12

**Impact:** If HF releases 5.0, users won't get automatic updates

**Migration plan:** 
- Monitor release notes for transformers.js v5
- Test adapter with new tokenizer/model API
- Update `TransformersJsAdapter.generate()` if method signatures change

### VitePWA Plugin ^1.2.0 - Deprecated Manifest Injection

**Risk:** Workbox 7 is stable, but VitePWA uses `injectManifest` strategy which requires manual service worker updates if offline behavior changes.

**Files:** `vite.config.js` - Lines 38-47

**Impact:** Static asset caching could become stale; users need manual cache clear

**Migration plan:** Consider switching to `generateSW` strategy for automatic updates

## Missing Critical Features

### No Offline Fallback for LLM

**Problem:** If user goes offline during model download, no retry mechanism resumes from checkpoint. Download restarts from beginning.

**Blocks:** Offline model loading on slower connections

**Impact:** High bounce on slow 4G networks during initial load

**Fix approach:** Implement partial download recovery in transformers.js adapter, or use Hugging Face hub resumable downloads

### No Preference Persistence Between Browser Sessions for Model Weights

**Problem:** While tracking and weights persist via IndexedDB, first-time users must wait for model load even after they return in a new session.

**Blocks:** Seamless offline-first experience for returning users

**Impact:** Users with flaky connections must reload model on each session

**Fix approach:** Cache model weights in IndexedDB using `model.toBuffer()` and lazy-load from cache

### Limited A/B Testing Capability

**Problem:** All reranking parameters (weights, cooldowns, thresholds) are hardcoded. Can't A/B test two variants without code changes.

**Blocks:** Data-driven optimization of ranking algorithm

**Fix approach:** Add experiment table to TinyBase store with variant assignments; read active variant in trigger engine and reranker

## Test Coverage Gaps

### No Tests for Reranking Score Formula

**What's not tested:** The ranking formula in `src/lib/reranker.js` with various weight combinations and edge cases

**Files:** `src/lib/reranker.js`

**Risk:** Score calculation bugs (e.g., NaN from missing variants, division by zero) go undetected

**Priority:** High — formula is core to personalization value

### No Tests for LLM Response Parsing Edge Cases

**What's not tested:**
- Malformed line-based format (missing colons, invalid keys)
- JSON fallback with nested structures
- Partial responses from timeout
- Non-English character handling in message field

**Files:** `src/lib/responseParser.js`

**Risk:** Unexpected LLM output could crash parser or return stale weights

**Priority:** High — parser is final step before reranking

### No Tests for Event Triggering Logic

**What's not tested:**
- Intent-based cooldown transitions (exploring → deciding → focused)
- Trigger threshold edge cases (exactly 5 events)
- New event counting after analysis

**Files:** `src/ai/triggerEngine.js`

**Risk:** Timing bugs in trigger logic cause inconsistent reranking frequency

**Priority:** Medium — affects user experience

### No Tests for Concurrent Model Requests

**What's not tested:** Multiple overlapping `generate()` calls during slow inference or network lag

**Files:** `src/hooks/useModelLoader.js`

**Risk:** Race condition if inference takes >2s and second trigger happens

**Priority:** Medium — affects UI responsiveness on slow devices

---

*Concerns audit: 2026-04-14*

# Testing Patterns

**Analysis Date:** 2026-04-14

## Test Framework

**Status:** No testing framework installed or configured.

**Not Found:**
- No Jest, Vitest, or other test runner in `package.json`
- No test files (`.test.js`, `.spec.js`) in codebase
- No test configuration files (`jest.config.js`, `vitest.config.js`)
- No testing libraries (@testing-library/react, @vitest/ui, etc.)

**Implications:**
- No automated unit tests
- No integration tests
- Manual testing required for verification
- No continuous integration testing pipeline

## Test File Organization

**Current State:** Not applicable — no test files present

**Recommended Structure (if tests were to be added):**
```
src/
├── lib/
│   ├── promptBuilder.js
│   └── promptBuilder.test.js        # Co-located
├── hooks/
│   ├── useReranker.js
│   └── useReranker.test.js          # Co-located
└── components/
    ├── ProductCard.jsx
    └── ProductCard.test.js          # Co-located
```

## Coverage

**Current:** No coverage tracking (no test runner)

**Potential Coverage Gaps (if tests existed):**
- `src/lib/responseParser.js` — Complex line-based parsing logic with many edge cases
- `src/lib/colorFamilies.js` — Weight propagation algorithm across color families
- `src/lib/reranker.js` — Product scoring formula with multiple weight factors
- `src/ai/eventFormatter.js` — Event windowing and formatting logic
- `src/ai/triggerEngine.js` — Intent-based trigger cooldown logic
- `src/hooks/useReranker.js` — Complex dual-flow orchestration (LLM + reorder)
- `src/tracking/trackingEngine.js` — Duration-based event classification
- `src/lib/modelAdapter.js` — Device capability detection and fallback
- Error paths in worker message handling (`src/hooks/useModelLoader.js`)

**Areas with Simple Logic (lower test priority if resources constrained):**
- Component render logic (`ProductCard.jsx`, `AIReasoningPanel.jsx`)
- Simple data access functions (`getProducts()`, `updatePositions()`)
- Formatter utilities (`formatDuration()`)

## Manual Testing Observations

**Key User Workflows (tested manually):**
1. Product catalog loads and displays with current weights
2. User interaction tracking captures events (observable in debug panel)
3. LLM inference triggered at ~2s intervals when enough events accumulated
4. Color weights propagate to related colors (visible in debug panel)
5. Products re-rank and animate on user idle
6. Drawer opens/closes and tracks variant interactions
7. AI can be toggled on/off without breaking state
8. Preferences reset clears all tracking and reverts to default order
9. App works offline (Service Worker registered)
10. Debug panel displays events, weights, profile, confidence, intent

**Debug Panel Verification:**
The `AIReasoningPanel` component includes a built-in debug view (`debugOpen` toggle) that displays:
- Event log with timestamps and event types
- LLM weights (colors, styles, categories)
- User profile (synthetic profile built from weights)
- Confidence and intent values

This serves as an integration test harness visible in the UI.

## Testing Strategy Recommendations

**Priority 1: Core Algorithm Tests**

**Response Parser (`src/lib/responseParser.js`):**
- Line-based format parsing edge cases (missing keys, malformed values)
- JSON fallback parsing with repair logic
- Confidence/intent validation and clamping
- Fallback to previous weights when parsing fails

Example test structure:
```javascript
describe('parseResponse', () => {
  it('parses valid line-based format', () => {
    const text = `COLOR rosso=1.0
STYLE elegant=0.7
CATEGORY flat=1.0
CONFIDENCE 0.8
INTENT exploring
MESSAGE Test message`
    const result = parseResponse(text)
    expect(result.color_weights.rosso).toBe(1.0)
    expect(result.confidence).toBe(0.8)
    expect(result.intent).toBe('exploring')
  })

  it('clamps confidence to [0, 1]', () => {
    const text = 'CONFIDENCE 1.5\nCOLOR rosso=1.0'
    const result = parseResponse(text, {})
    expect(result.confidence).toBe(1.0)
  })

  it('validates intent enum', () => {
    const text = 'INTENT invalid\nCOLOR rosso=1.0'
    const result = parseResponse(text, {})
    expect(result.intent).toBe('deciding') // default
  })

  it('falls back to JSON when line-based fails', () => {
    const json = '{"color_weights":{"rosso":0.5},"style_weights":{},"category_weights":{}}'
    const result = parseResponse(json)
    expect(result.color_weights.rosso).toBe(0.5)
  })
})
```

**Color Propagation (`src/lib/colorFamilies.js`):**
- Weight propagation doesn't override direct LLM weights
- Propagation respects family, shade, and adjacent relationships
- Propagated weights capped at maxPropagatedWeight
- Only propagates from weights > minWeightToPropagate

Example:
```javascript
describe('propagateColorWeights', () => {
  it('propagates within same color family', () => {
    const raw = { rosso: 1.0 }
    const result = propagateColorWeights(raw)
    // rosso propagates to other warm colors at familyFactor strength
    expect(result.arancione).toBe(1.0 * 0.4)
  })

  it('does not override existing direct weights', () => {
    const raw = { rosso: 1.0, arancione: -0.5 }
    const result = propagateColorWeights(raw)
    expect(result.arancione).toBe(-0.5) // unchanged
  })

  it('respects maxPropagatedWeight cap', () => {
    const raw = { rosso: 2.0 } // would be clamped to 1.0
    const result = propagateColorWeights(raw)
    const propagated = result.arancione
    expect(Math.abs(propagated)).toBeLessThanOrEqual(0.5) // maxPropagatedWeight
  })
})
```

**Reranker Scoring (`src/lib/reranker.js`):**
- Correct weight application: color(40) + style(20) + category(30) + stock(5)
- Confidence multiplier scales final score
- Highest score products appear first
- Handles missing weights gracefully

Example:
```javascript
describe('rankProducts', () => {
  it('applies weight formula correctly', () => {
    const products = [{
      id: 'p1',
      variants: [{ color: 'rosso', inStock: 1 }],
      styles: ['elegant'],
      category: 'flat'
    }]
    const weights = {
      color_weights: { rosso: 1.0 },
      style_weights: { elegant: 1.0 },
      category_weights: { flat: 1.0 },
      confidence: 1.0
    }
    const result = rankProducts(products, weights)
    // Score = (1*40 + 1*20 + 1*30 + 1*5) * 1.0 = 95
    expect(result[0]).toBe('p1')
  })

  it('applies confidence multiplier', () => {
    // Product with score 95, confidence 0.5 → effective score 47.5
  })
})
```

**Priority 2: Event Processing Tests**

**Event Formatter (`src/ai/eventFormatter.js`):**
- Sliding window respects MAX_EVENTS limit
- Timestamps relative to first event (T+Ns format)
- Event labels mapped from config
- Unknown event types handled gracefully

**Tracking Engine (`src/tracking/trackingEngine.js`):**
- Duration-based classification (hover < 400ms vs >= 1500ms)
- Revisit detection tracks visited products in session
- Scroll detection within 2s threshold

**Priority 3: Hook Integration Tests**

**useReranker (`src/hooks/useReranker.js`):**
- Two independent intervals (LLM ~2s, reorder 1s)
- LLM flow: format → trigger → prompt → generate → parse → propagate → save
- Reorder flow: waits for user idle before applying new ranking
- Drawer product kept in place during reorder

**useModelLoader (`src/hooks/useModelLoader.js`):**
- Worker creation and message passing
- Retry logic on failure (max 2 retries)
- Timeout handling (30s default)
- Progress reporting with throttling

## What NOT to Test

- React component rendering (not production-critical in this POC)
- Framer Motion animation states
- CSS/Tailwind class application
- Service Worker caching (browser-specific)
- IndexedDB persistence (tested by TinyBase)
- External API calls (Hugging Face transformers.js — would need mocks)

## Code Patterns That Enable Testing

**Pure Functions (easily testable):**
- `parseResponse(text, fallbackWeights)` — deterministic
- `propagateColorWeights(rawWeights)` — deterministic
- `rankProducts(products, weights)` — deterministic
- `formatEvents()` — reads from store but predictable given stored data
- `buildPrompt(eventsText, userProfile)` — pure transformation

**Dependency Injection for Testing:**
- Logger calls allow interception (could mock `logger.parse()` to assert calls)
- Configuration objects (`TRACKING_CONFIG`, `MODEL_CONFIG`) are centralized and importable

**Challenges:**
- TinyBase store access (`store.getTable()`) scattered throughout business logic
- Would benefit from dependency injection layer or store mocks
- Worker-based inference difficult to test without mocking
- react hook logic tightly coupled to timers and refs

---

*Testing analysis: 2026-04-14*

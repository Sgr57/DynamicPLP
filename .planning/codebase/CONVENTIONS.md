# Coding Conventions

**Analysis Date:** 2026-04-14

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `ProductCard.jsx`, `AIReasoningPanel.jsx`)
- Utilities and libraries: camelCase (e.g., `eventFormatter.js`, `promptBuilder.js`)
- Hooks: camelCase with `use` prefix (e.g., `useReranker.js`, `useModelLoader.js`)
- Configuration files: camelCase (e.g., `trackingConfig.js`, `modelConfig.js`)
- Repo files: camelCase with `Repo` suffix (e.g., `aiMemoryRepo.js`, `productsRepo.js`)

**Functions:**
- Exported utility functions: camelCase (e.g., `formatEvents()`, `buildPrompt()`, `rankProducts()`)
- React hooks: camelCase with `use` prefix (e.g., `useReranker()`, `useModelLoader()`)
- Handler functions in components: camelCase with `handle` prefix (e.g., `handleCardClick()`, `handleSwatchClick()`)
- Tracker methods: camelCase with `on` prefix (e.g., `onMouseEnter()`, `onSwatchClick()`)

**Variables:**
- State variables: camelCase (e.g., `isAnalyzing`, `lastMessage`, `drawerProduct`)
- Constants: UPPER_SNAKE_CASE for config values (e.g., `MAX_EVENTS`, `W_COLOR`, `TRACKING_CONFIG`)
- Object properties: camelCase (e.g., `productId`, `eventType`, `colorWeights`)
- Colors and enums: lowercase with underscores when multi-word (e.g., `blue_scuro`, `flat`)

**Types & Structures:**
- Database table names: lowercase (e.g., `products`, `variants`, `trackingEvents`, `aiMemory`)
- Row IDs: descriptive format (e.g., `var_${productId}_${index}`)
- Message roles: lowercase (e.g., `system`, `user`, `assistant`)

## Code Style

**Formatting:**
- No explicit formatter (prettier not in package.json)
- 2-space indentation (observed in all source files)
- Semicolons at end of statements (used consistently)
- Spacing: single space after keywords (`if (x)`, not `if(x)`)

**Linting:**
- No ESLint configuration detected
- No TypeScript (pure JavaScript/JSX)
- Import statement style: ES modules with full relative paths
- No strict import ordering enforced, but general pattern observed:
  1. React/external libraries
  2. Internal library utilities
  3. Database/data access
  4. Local components
  5. CSS/styles

**Comments & JSDoc:**
- JSDoc used selectively for complex functions and exported APIs
- JSDoc pattern: triple-slash comments above function definition
- Multi-line comments for module-level documentation (e.g., `colorFamilies.js`, `responseParser.js`)
- Inline comments for algorithms and non-obvious logic
- Comments in Italian (following project language, see `eventFormatter.js`, `trackingConfig.js`)
- Technical comments may use directional arrows: `// ← Switch active model here`

**Examples:**
```javascript
/**
 * Propagate LLM color weights to related colors.
 * Only propagates from weights with |value| > minWeightToPropagate.
 * Propagated values are capped at maxPropagatedWeight.
 * Direct LLM weights are never overridden — propagation only fills gaps.
 */
export function propagateColorWeights(rawWeights) { ... }
```

```javascript
/**
 * Creates a PLP tracker for a single product card.
 * Returns handler functions to be wired to DOM events.
 */
export function createPLPTracker(productId, variants) { ... }
```

## Import Organization

**Order:**
1. React and external UI libraries (`react`, `framer-motion`)
2. External utilities (`lodash`)
3. Internal data/store access (`./db/*`)
4. Internal business logic (`./ai/*`, `./lib/*`, `./tracking/*`)
5. Internal components and hooks
6. CSS/style files

**Path Aliases:**
- No import aliases configured
- Relative imports always use `./` (e.g., `'../db/store'`, `'../lib/colorFamilies'`)
- Dynamic imports for Workers: `new URL('../lib/modelWorker.js', import.meta.url)`

**Examples:**
```javascript
// App.jsx
import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { initStore, store } from './db/store'
import { getProducts, updatePositions } from './db/productsRepo'
import { rankProducts } from './lib/reranker'
import { startMouseTracking, stopMouseTracking } from './tracking/mouseActivityTracker'
import { useModelLoader } from './hooks/useModelLoader'
import PLPGrid from './components/PLPGrid'
import ModelLoader from './components/ModelLoader'
```

## Error Handling

**Pattern: Silent Fallback**
- Most error handling uses try-catch with silent failures (comments: `// Silent fallback`)
- No error boundaries for React components
- Worker failures trigger retry logic with max retries (see `useModelLoader.js`)
- Logger calls for failures to console (prefixed `[PLP]`)

**Examples:**
```javascript
// Lightweight exception handling with silent fallback
try {
  const currentProducts = getProducts()
  const orderedIds = rankProducts(currentProducts, lastWeights)
  updatePositions(orderedIds)
} catch {
  // Silent fallback
}
```

```javascript
// Worker error retry with fallback
worker.onerror = (err) => handleWorkerFailure(err)

function handleWorkerFailure(err) {
  if (retryCount < MAX_RETRIES) {
    retryCount++
    startWorker()
  } else {
    setStatus('error')
  }
}
```

**Validation:**
- Weights clamped to [-1.0, 1.0] range (enforced in `parseResponse()`)
- Confidence scores clamped to [0.0, 1.0]
- Intent values validated against enum: `['exploring', 'deciding', 'focused']`
- Fallback to default values (e.g., confidence defaults to 0.5, intent to 'deciding')

## Logging

**Framework:** Native `console` with custom logger wrapper

**Logger Location:** `src/lib/logger.js`

**Logger API:**
- `logger.track({ eventType, productId, color, duration })` — user interaction events
- `logger.trigger(pass, msg)` — trigger engine decisions
- `logger.llmSend(evtCount)` — LLM prompt sent
- `logger.llmSendDetail(messages)` — full prompt content (grouped)
- `logger.llmRecv(ms)` — LLM response received with timing
- `logger.llmRecvDetail(text)` — raw model output (grouped)
- `logger.llmWeights(weights)` — parsed weights object (grouped)
- `logger.llmError(err)` — LLM pipeline errors
- `logger.parse(ok, msg)` — response parser success/failure
- `logger.reorder(msg)` — reordering operation
- `logger.model(msg)` — model loading messages
- `logger.modelLoaded(ms)` — model ready with load time
- `logger.pipeline(phases)` — performance breakdown across stages
- `logger.modelError(err)` — worker/model fatal errors
- `logger.warn(phase, msg)` — warnings with phase tag

**Logging Prefix:** All logs prefixed with `[PLP]` followed by phase and icon

**Patterns:**
- Grouped logs (`console.groupCollapsed`) for detailed data
- Icons/symbols for visual scanning: `←`, `→`, `✓`, `✗`, `⚠`
- Structured phase labels: phase name padded to 8 characters
- Performance timing attached to async operations

## Function Design

**Size:** Most utility functions are small (5-30 lines) with clear single responsibility

**Parameters:**
- Positional arguments for required data
- Configuration passed via import (e.g., `TRACKING_CONFIG`, `MODEL_CONFIG`)
- Callback functions for observers/trackers (e.g., `onProgress` callback in model loader)

**Return Values:**
- Functions return data objects or primitives
- Void functions used for side-effects (event insertion, state updates)
- Array returns used for lists (e.g., `rankProducts()` returns `[id1, id2, ...]`)
- Object returns with multiple fields (e.g., `formatEvents()` returns `{ text, totalEvents }`)

**Examples:**
```javascript
// Small utility with clear purpose
export function getProducts() {
  const products = store.getTable('products')
  const variants = store.getTable('variants')
  return Object.entries(products)
    .map(([id, p]) => ({ ...p, id, ... }))
    .sort((a, b) => a.position - b.position)
}

// Tracker factory returning handler object
export function createPLPTracker(productId, variants) {
  return {
    onMouseEnter() { ... },
    onMouseLeave() { ... },
    onSwatchClick(color) { ... },
  }
}
```

## Module Design

**Exports:**
- Named exports for utilities (e.g., `export function buildPrompt(...)`)
- Default export for React components (e.g., `export default function App()`)
- Configuration objects exported as named exports (e.g., `export const TRACKING_CONFIG`)

**Barrel Files:**
- `src/components/icons/index.js` exports icon map: `CATEGORY_ICON_MAP`
- No other barrel files detected

**File Organization by Layer:**
- `src/db/` — Data access layer (TinyBase queries)
- `src/lib/` — Business logic utilities (scoring, parsing, prompt building)
- `src/tracking/` — User interaction tracking
- `src/hooks/` — React custom hooks
- `src/components/` — React components
- `src/ai/` — LLM-specific logic (event formatting, trigger detection)
- `src/data/` — Static configuration and constants
- `src/main.jsx` — React entry point

## Tailwind CSS Usage

**Classes:** No explicit CSS naming conventions (using Tailwind classes directly)

**Component Pattern:**
- Inline Tailwind classes in JSX (e.g., `className="flex items-center gap-2"`)
- No CSS modules or separate stylesheets
- Dynamic class names computed inline (e.g., `className={isPositive ? 'text-indigo-600' : 'text-red-500'}`)

**Typography:**
- Semantic text sizes: `text-sm`, `text-xs`, `text-[10px]`, `text-[11px]`
- Font weights: `font-semibold`, `font-bold`, `font-mono` for monospace
- Text colors: indigo/purple for primary, red for negative, gray for neutral

**Example:**
```javascript
<div className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
  {title}
</div>
```

---

*Convention analysis: 2026-04-14*

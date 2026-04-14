# Architecture

**Analysis Date:** 2026-04-14

## Pattern Overview

**Overall:** Event-driven reactive pipeline with dual-flow orchestration

**Key Characteristics:**
- Local-first: All data persisted to IndexedDB via TinyBase, no backend required
- Reactive store: TinyBase provides auto-subscription and auto-persistence (no manual save)
- Dual-flow: LLM inference runs every ~2s (Flow A), reordering applies every 1s when user idle (Flow B)
- In-browser LLM: Gemma 4 E2B runs in WebWorker with WebGPU acceleration
- Event-sourced profiling: User intent captured via fine-grained interaction events, no catalog in LLM prompt
- Intent-aware cooldown: LLM classifies user state (exploring/deciding/focused); each state has different trigger threshold
- Confidence-weighted reranking: LLM returns confidence score (0-1) that scales final ranking formula

## Layers

**Presentation Layer:**
- Purpose: React components for PLP grid, product cards, detail drawer, and debug panels
- Location: `src/components/`
- Contains: JSX components, icon SVGs, animations via Framer Motion
- Depends on: Hooks (useReranker, useModelLoader), data layer via repo pattern
- Used by: App.jsx (root component)

**Business Logic Layer:**
- Purpose: Orchestration of tracking → analysis → ranking pipeline
- Location: `src/hooks/useReranker.js` (dual-flow orchestrator)
- Contains: Flow A (LLM trigger every ~2s), Flow B (reorder every 1s on user idle)
- Depends on: Tracking, AI (formatter/trigger), parsing, reranking, persistence
- Used by: App.jsx for primary UI state

**AI Pipeline Layer:**
- Purpose: Event formatting, trigger evaluation, prompt building, response parsing
- Location: `src/ai/` and `src/lib/promptBuilder.js`, `src/lib/responseParser.js`
- Contains:
  - `eventFormatter.js`: Converts raw events to human-readable log (sliding window 350 events max)
  - `triggerEngine.js`: Evaluates trigger conditions (min events, cooldown, new event threshold)
  - `promptBuilder.js`: Assembles system prompt (Italian), event log, user profile, few-shot example
  - `responseParser.js`: Line-based parsing (COLOR/STYLE/CATEGORY/CONFIDENCE/INTENT/MESSAGE) + JSON fallback
- Depends on: Tracking events, AI memory
- Used by: useReranker hook

**Tracking Layer:**
- Purpose: Capture user interactions on PLP and drawer with anti-accidental filters
- Location: `src/tracking/trackingEngine.js`, `src/tracking/mouseActivityTracker.js`, `src/tracking/trackingConfig.js`
- Contains:
  - Tracker factories: `createPLPTracker()`, `createScrollObserver()`, `trackCardRevisit()`
  - Configuration: Event types, enabled/disabled, duration thresholds, revisit logic
  - Mouse activity tracker: Idle detection for reorder trigger
- Depends on: Tracking repo (insertEvent)
- Used by: ProductCard, ProductDrawer, useDrawerTracker hook

**Inference Engine:**
- Purpose: Run LLM in WebWorker, handle model loading with retry, manage lifecycle
- Location: `src/lib/modelWorker.js` (worker thread), `src/lib/modelAdapter.js`, `src/lib/adapters/transformersJsAdapter.js`
- Contains:
  - Worker message protocol: load → progress → ready, generate → result/error, abort, dispose
  - Adapter pattern: TransformersJsAdapter encapsulates @huggingface/transformers API
  - Device detection: Fallback from WebGPU → WASM
  - Progress throttling: 250ms to prevent UI thrashing
- Depends on: @huggingface/transformers, WebGPU API
- Used by: useModelLoader hook

**Reranking Engine:**
- Purpose: Score products based on LLM weights and reorder by confidence-weighted formula
- Location: `src/lib/reranker.js` and `src/lib/colorFamilies.js`
- Contains:
  - `rankProducts()`: Composite score formula (color×40 + style×20 + category×30 + stock×5) × confidence
  - `propagateColorWeights()`: Spreads weights to related colors (family 0.4, shade 0.6, adjacent 0.2) without overriding direct LLM weights
- Depends on: Product variants and color relationships
- Used by: useReranker hook and App.jsx

**Data Layer:**
- Purpose: Repository pattern encapsulating TinyBase store access
- Location: `src/db/`
- Contains:
  - `store.js`: Initializes TinyBase, IndexedDB persister, seeding from catalog
  - `productsRepo.js`: getProducts() (with position sort), updatePositions()
  - `trackingRepo.js`: insertEvent(), getAllEvents() (sorted by createdAt), getSessionStats()
  - `aiMemoryRepo.js`: getMemoryValue(), setMemoryValue() (with JSON serialization), saveWeights(), getWeights()
- Depends on: TinyBase, IndexedDB
- Used by: All layers that need persistent state

**Model Configuration:**
- Purpose: Define LLM model, inference parameters, and capability detection
- Location: `src/data/modelConfig.js`, `src/lib/deviceCapabilities.js`
- Contains: Model selection (Qwen3 or Gemma4), dtype, device, temperature/top_p/max_tokens, timeout
- Depends on: Browser GPU/WASM capabilities
- Used by: useModelLoader, transformersJsAdapter

## Data Flow

**Track → Analyze → Rank → Display Cycle (10s typical):**

1. **User Interaction** (continuous)
   - ProductCard hover/click, color swatch interaction → `createPLPTracker()` handler
   - ProductDrawer open/close, variant cycling → `useDrawerTracker()` hook
   - Scroll detection → `createScrollObserver()` in IntersectionObserver
   - All events → `insertEvent()` in `trackingRepo.js` → stored in `trackingEvents` table

2. **Flow A: LLM Invocation (every 2000ms)**
   - Check if trigger conditions met via `shouldTrigger()` (at least 5 events, cooldown elapsed, 5 new events since last)
   - If triggered:
     - `formatEvents()`: Convert last 350 events to human-readable log ("T+Ns | action | category, styles | color")
     - `buildPrompt()`: Assemble messages array (system + fewshot + user event log + prev profile)
     - `generate()`: Send to worker, get LLM response (max 200 tokens, 30s timeout)
     - `parseResponse()`: Extract weights (line-based or JSON) with denormalization (color name normalization)
     - `propagateColorWeights()`: Spread weights to related colors via family/shade/adjacent relationships
     - `saveWeights()`: Persist new weights to `aiMemory.last_weights`
     - Update user profile from top weights (synthetic profile for next cycle)
     - Save intent, confidence, message to aiMemory

3. **Flow B: Reorder on User Idle (every 1000ms)**
   - Check `isUserIdle(reorderInactivitySeconds=1)` via mouseActivityTracker
   - If idle:
     - `rankProducts()`: Score each product using saved weights
     - Special handling: If drawer open, keep drawer product at current position
     - `updatePositions()`: Write new position index to products table
     - Trigger PLPGrid re-render with Framer Motion layout animations

4. **Pre-personalized Startup:**
   - On app init, load `last_weights` from aiMemory
   - If weights exist, apply ranking immediately (no wait for LLM)
   - User sees pre-personalized PLP while model loads

**State Management:**
- Product list state: useReranker's `products` (RefreshProducts updates from getProducts())
- Weights state: useReranker's `currentWeights` (updates on LLM response)
- UI state: App.jsx manages appState (loading/model_loading/browsing), drawer visibility, AI enabled flag
- User profile: aiMemory.user_profile (text, built from top weights)
- Persistent metadata: lastAnalysisAt, lastEventCount, intent, confidence, message (all in aiMemory)

## Key Abstractions

**Repository Pattern:**
- Purpose: Abstract TinyBase access behind simple query/mutation functions
- Examples: `src/db/productsRepo.js`, `src/db/trackingRepo.js`, `src/db/aiMemoryRepo.js`
- Pattern: Each repo exports only read/write functions; never expose store directly to components

**Tracker Factories:**
- Purpose: Create reusable event capture handlers for a product/drawer
- Examples: `createPLPTracker(productId, variants)`, `createScrollObserver(productId, element)`
- Pattern: Return handler object with named functions (onMouseEnter, onMouseLeave, onClick) ready to wire to DOM

**Model Adapter:**
- Purpose: Abstract LLM inference behind a single interface (load, generate, dispose)
- Examples: `TransformersJsAdapter`, potential `WebLlmAdapter`
- Pattern: Adapter encapsulates tokenizer + model; worker manages lifecycle via message protocol

**Color Families:**
- Purpose: Define color relationships and propagation rules
- Examples: Warm (rosso/arancione/giallo), Cool (blu/verde), Neutrals (nero/bianco/grigio)
- Pattern: Lookup tables (colorToFamily, shadePartners, adjacentMap) enable efficient propagation without catalog

## Entry Points

**App Root:**
- Location: `src/main.jsx`
- Triggers: Browser load
- Responsibilities: Mount React root to DOM

**App Component:**
- Location: `src/App.jsx`
- Triggers: React init
- Responsibilities: Initialize store, start tracking, manage app state (loading/model_loading/browsing), render layout with header/grid/footer/drawer

**useReranker Hook:**
- Location: `src/hooks/useReranker.js`
- Triggers: App mounts; engineReady or engineReady changes
- Responsibilities: Orchestrate dual-flow (Flow A every 2s, Flow B every 1s), manage products and weights state

**useModelLoader Hook:**
- Location: `src/hooks/useModelLoader.js`
- Triggers: App mounts; device capabilities check
- Responsibilities: Spawn worker, handle load with retry (max 2), expose generate callback, report progress/status

**ProductCard Component:**
- Location: `src/components/ProductCard.jsx`
- Triggers: PLPGrid renders
- Responsibilities: Wire tracker handlers, render product image/colors, handle drawer open, preselect preferred color variant

**ProductDrawer Component:**
- Location: `src/components/ProductDrawer.jsx`
- Triggers: User clicks product card
- Responsibilities: Mount drawer tracker hook, track open/close duration, variant cycling, render detail view

## Error Handling

**Strategy:** Silent fallback with logging. No user-facing error dialogs for AI pipeline; degraded experience is acceptable.

**Patterns:**

- **LLM Inference Timeout:** 30s timeout in useModelLoader. If inference doesn't return, abort and retry prompt next cycle.
- **Model Load Failure:** Max 2 retries with exponential backoff. After retries exhausted, set status='error' and disable AI.
- **Parse Failure:** If LLM response can't be parsed (line-based or JSON), fallback to previous weights. Log parse error.
- **IndexedDB Unavailable:** Initializer catches persister error, logs warning, continues in-memory only. No persistence but app works.
- **Device Capability Check:** If WebGPU unavailable, fallback to WASM. If browser too old (no IndexedDB), set canRunModel=false.
- **Worker Crash:** useModelLoader detects worker error, terminates, retries. After max retries, disable AI inference.
- **Store Uninitialized:** All repo functions check store state before access. Empty tables return [].
- **Tracker Event Insertion:** Wrapped in try/catch; silent failure to prevent tracking errors from breaking UI.

## Cross-Cutting Concerns

**Logging:**
- Framework: Console only (no external service)
- Approach: Phase-tagged logs (track/trigger/llm/parse/reorder/model) with icons and structured data
- File: `src/lib/logger.js` provides logger API with methods for each phase
- Consumer visibility: Logs appear in browser DevTools Console; sticky AIReasoningPanel shows latest LLM message

**Validation:**
- LLM weights clamped to [-1.0, 1.0] in parseResponse and colorFamilies
- Confidence clamped to [0.0, 1.0]
- Intent validated to one of (exploring/deciding/focused), defaults to 'deciding'
- Color names normalized via denormalizeKey (replace underscores, trim)
- Product position indices validated on load (sort by position)

**Authentication:**
- Not applicable (local-first, no backend)

**Offline Support:**
- Service Worker (Workbox 7) registers in production for offline capability
- All data persisted to IndexedDB, accessible even if network unavailable
- LLM runs entirely client-side; no API calls needed
- AI disabled if browser lacks WebGPU/WASM support

---

*Architecture analysis: 2026-04-14*

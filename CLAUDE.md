# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DynamicPLP is a **Local First** proof-of-concept: an AI-powered Product Listing Page (PLP) for a shoe e-commerce that personalizes product order in real-time using an LLM running entirely in the browser. All data (catalog, behavior tracking, AI memory) lives in TinyBase with IndexedDB auto-persistence — no backend, no data leaves the device.

## Tech Stack

- **React 18** + **Vite 5** + **Tailwind CSS 3** + **Framer Motion 11**
- **TinyBase** (~10 KB) reactive tabular store with IndexedDB auto-persist
- **@huggingface/transformers** with Gemma 4 E2B for in-browser inference via WebGPU
- **Workbox 7** Service Worker for full offline capability
- Language: JavaScript (JSX), no TypeScript

## Build & Dev Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
```

## Architecture

### Data Layer (Local First)

TinyBase store `plp_demo` persisted on IndexedDB with 4 tables: `products`, `variants`, `trackingEvents`, `aiMemory`. The **Repository pattern** (`src/db/*Repo.js`) encapsulates all data access — components never call TinyBase directly. `store.js` initializes the TinyBase store, IndexedDB persister (auto-load + auto-save), and seed.

### Tracking → Stats → LLM → Re-ranking Pipeline

1. **trackingEngine** captures user interactions (hover, click, scroll) with anti-accidental filters (dead zone 400-1500ms, minimum durations) → writes to `trackingEvents` via `trackingRepo`
2. **eventFormatter** (`src/ai/`) builds a human-readable event log from trackingEvents (format: `T+Ns | action | category, styles | color`, max 350 events sliding window)
3. **triggerEngine** (`src/ai/`) evaluates: ≥5 interactions, ≥5 new events since last analysis, intent-based cooldown (exploring/deciding/focused), base cooldown 5s
4. **promptBuilder** assembles: system prompt (Italian) + event log + user profile + few-shot example. 7-line response format: PROFILE, COLOR, STYLE, CATEGORY, CONFIDENCE, INTENT, MESSAGE. **No catalog in prompt.**
5. **Transformers.js** (Gemma 4 E2B) runs in a Web Worker (`modelWorker.js`); `useModelLoader` handles loading with retry (max 2), timeout (30s), and throttled progress reporting
6. **responseParser** uses line-based parsing (key=value) with JSON fallback. Weights clamped -1.0 to 1.0, intent validated (exploring|deciding|focused), confidence 0.0-1.0
7. **colorFamilies** propagates weights to related colors (family factor 0.4, shade 0.6, adjacent 0.2) without overriding direct LLM weights
8. **reranker** scores: `(colorScore×40 + styleScore×20 + categoryScore×30 + stockBonus×5) × confidence` → updates `position` in TinyBase store
9. **PLPGrid** re-renders with Framer Motion layout animations + **preselects preferred color variant** on each card

> Full flow documentation with formulas and tables: [`docs/SCORING_FLOW.md`](docs/SCORING_FLOW.md)

### Key Design Decisions

- **Event-based profiling**: LLM receives a formatted event log (not raw events or catalog). The catalog never enters the prompt.
- **Intent-based cooldown**: LLM classifies user intent (exploring/deciding/focused); each state has a different trigger cooldown.
- **Color propagation**: weights spread to related colors via family, shade, and adjacent relationships.
- **Confidence multiplier**: LLM returns a confidence score (0-1) that scales the final ranking scores.
- **Dual-flow orchestrator** (`useReranker`): LLM inference runs every ~2s when triggered; reorder applies on 1s user-idle, keeping them independent.
- **Worker-based inference**: model loads and runs in a Web Worker for UI thread isolation; retry on failure.
- **Color preselection**: after reranking, ProductCards auto-select the variant matching the user's preferred color.
- **Pre-personalized startup**: `last_weights` in `aiMemory` allows the PLP to load with the last known ranking before the LLM is ready.
- **Debug overlay**: real-time affinities, LLM weights, and user profile visible in the sticky AI panel (`AIReasoningPanel`).
- **Auto-persistence**: TinyBase IndexedDB persister handles all persistence automatically.
- Tracking config (weights, thresholds, cooldowns, event types, color propagation) is centralized in `trackingConfig.js`.
- **Drawer tracking**: `useDrawerTracker` hook tracks open/close duration, quick-close (negative signal), variant cycling, time spent.

## Browser Requirements

WebGPU (Chrome 113+) is required for the LLM. IndexedDB (all modern browsers) is used for persistence.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**DynamicPLP — Stabilization & Polish**

AI-powered Product Listing Page for shoe e-commerce that personalizes product order in real-time using an LLM running entirely in the browser. Local-first PoC built with React, TinyBase, and Transformers.js. Must work smoothly and convincingly for sales demos.

**Core Value:** The PLP must dynamically reorder products based on user behavior, powered by a local LLM, in a way that is visually convincing and reliable enough to sell the concept.

### Constraints

- **PoC quality**: Must be convincing for demos, not production-hardened
- **Local-first**: No backend, all data stays on device
- **WebGPU**: Primary inference target (WASM fallback exists)
- **JavaScript only**: No TypeScript in this codebase
- **Browser**: Chrome 113+ required for WebGPU
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (JSX) - All source code, components, and business logic
- No TypeScript
- HTML - Entry points
- CSS - Styles processed via PostCSS/Tailwind
## Runtime
- Node.js (development only)
- npm
- Lockfile: `package-lock.json` (present, v3)
## Frameworks
- React 18.3.0 - UI library, component-based architecture
- Vite 5.4.0 - Build tool and development server
- Vite PWA Plugin 1.2.0 - Progressive Web App configuration
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- PostCSS 8.4.0 - CSS transformation pipeline
- Autoprefixer 10.4.0 - Browser vendor prefix automation
- Framer Motion 11.0.0 - React animation library for layout animations and transitions
## Key Dependencies
- `@huggingface/transformers` 4.0.1 - In-browser LLM inference library (Transformers.js)
- `tinybase` 5.0.0 - Local-first reactive tabular store with IndexedDB persistence
- `lodash` 4.17.21 - Utility library for functional programming patterns
- `workbox-precaching` 7.4.0 - Service worker asset caching
- `workbox-routing` 7.4.0 - Service worker request routing
- `workbox-strategies` 7.4.0 - Service worker caching strategies
- `@vitejs/plugin-react` 4.3.0 - Vite React plugin with JSX support
## Configuration
- No `.env` file required (local-first architecture)
- All configuration is compile-time or stored in TinyBase
- Model selection: `src/data/modelConfig.js`
- Tracking config: `src/tracking/trackingConfig.js`
- Color propagation: `src/lib/colorFamilies.js`
- Vite config: `vite.config.js`
- PostCSS config: `postcss.config.js`
- Tailwind config: `tailwind.config.js`
- Manifest injection: `vite-plugin-pwa` injects Workbox manifest
- SW file: `sw.js`
- Precaching strategy: Precache and route
- Static asset caching: `static-cache` (JS, CSS, fonts)
## Platform Requirements
- Node.js (any recent version)
- npm or compatible package manager
- Modern browser with WebGPU support (Chrome 113+)
- IndexedDB support (all modern browsers)
- SharedArrayBuffer support (required for WASM ONNX Runtime multi-threading)
- Service Worker support (all modern browsers)
- Static hosting (Vercel, Netlify, Cloudflare, GitHub Pages, etc.)
- COOP/COEP header configuration required at host level
- Must be served over HTTPS for Service Worker
## Notes
- **Local-first**: No external backend, API, or CDN dependencies beyond Hugging Face model hub
- **Model inference**: Runs entirely in browser via Web Worker
- **Data storage**: All persistence via TinyBase + IndexedDB, no database backend
- **Offline capable**: Full offline functionality after initial load via Service Worker
- **WebGPU requirement**: While WebGPU preferred, fallback to WASM is available
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase (e.g., `ProductCard.jsx`, `AIReasoningPanel.jsx`)
- Utilities and libraries: camelCase (e.g., `eventFormatter.js`, `promptBuilder.js`)
- Hooks: camelCase with `use` prefix (e.g., `useReranker.js`, `useModelLoader.js`)
- Configuration files: camelCase (e.g., `trackingConfig.js`, `modelConfig.js`)
- Repo files: camelCase with `Repo` suffix (e.g., `aiMemoryRepo.js`, `productsRepo.js`)
- Exported utility functions: camelCase (e.g., `formatEvents()`, `buildPrompt()`, `rankProducts()`)
- React hooks: camelCase with `use` prefix (e.g., `useReranker()`, `useModelLoader()`)
- Handler functions in components: camelCase with `handle` prefix (e.g., `handleCardClick()`, `handleSwatchClick()`)
- Tracker methods: camelCase with `on` prefix (e.g., `onMouseEnter()`, `onSwatchClick()`)
- State variables: camelCase (e.g., `isAnalyzing`, `lastMessage`, `drawerProduct`)
- Constants: UPPER_SNAKE_CASE for config values (e.g., `MAX_EVENTS`, `W_COLOR`, `TRACKING_CONFIG`)
- Object properties: camelCase (e.g., `productId`, `eventType`, `colorWeights`)
- Colors and enums: lowercase with underscores when multi-word (e.g., `blue_scuro`, `flat`)
- Database table names: lowercase (e.g., `products`, `variants`, `trackingEvents`, `aiMemory`)
- Row IDs: descriptive format (e.g., `var_${productId}_${index}`)
- Message roles: lowercase (e.g., `system`, `user`, `assistant`)
## Code Style
- No explicit formatter (prettier not in package.json)
- 2-space indentation (observed in all source files)
- Semicolons at end of statements (used consistently)
- Spacing: single space after keywords (`if (x)`, not `if(x)`)
- No ESLint configuration detected
- No TypeScript (pure JavaScript/JSX)
- Import statement style: ES modules with full relative paths
- No strict import ordering enforced, but general pattern observed:
- JSDoc used selectively for complex functions and exported APIs
- JSDoc pattern: triple-slash comments above function definition
- Multi-line comments for module-level documentation (e.g., `colorFamilies.js`, `responseParser.js`)
- Inline comments for algorithms and non-obvious logic
- Comments in Italian (following project language, see `eventFormatter.js`, `trackingConfig.js`)
- Technical comments may use directional arrows: `// ← Switch active model here`
## Import Organization
- No import aliases configured
- Relative imports always use `./` (e.g., `'../db/store'`, `'../lib/colorFamilies'`)
- Dynamic imports for Workers: `new URL('../lib/modelWorker.js', import.meta.url)`
## Error Handling
- Most error handling uses try-catch with silent failures (comments: `// Silent fallback`)
- No error boundaries for React components
- Worker failures trigger retry logic with max retries (see `useModelLoader.js`)
- Logger calls for failures to console (prefixed `[PLP]`)
- Weights clamped to [-1.0, 1.0] range (enforced in `parseResponse()`)
- Confidence scores clamped to [0.0, 1.0]
- Intent values validated against enum: `['exploring', 'deciding', 'focused']`
- Fallback to default values (e.g., confidence defaults to 0.5, intent to 'deciding')
## Logging
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
- Grouped logs (`console.groupCollapsed`) for detailed data
- Icons/symbols for visual scanning: `←`, `→`, `✓`, `✗`, `⚠`
- Structured phase labels: phase name padded to 8 characters
- Performance timing attached to async operations
## Function Design
- Positional arguments for required data
- Configuration passed via import (e.g., `TRACKING_CONFIG`, `MODEL_CONFIG`)
- Callback functions for observers/trackers (e.g., `onProgress` callback in model loader)
- Functions return data objects or primitives
- Void functions used for side-effects (event insertion, state updates)
- Array returns used for lists (e.g., `rankProducts()` returns `[id1, id2, ...]`)
- Object returns with multiple fields (e.g., `formatEvents()` returns `{ text, totalEvents }`)
## Module Design
- Named exports for utilities (e.g., `export function buildPrompt(...)`)
- Default export for React components (e.g., `export default function App()`)
- Configuration objects exported as named exports (e.g., `export const TRACKING_CONFIG`)
- `src/components/icons/index.js` exports icon map: `CATEGORY_ICON_MAP`
- No other barrel files detected
- `src/db/` — Data access layer (TinyBase queries)
- `src/lib/` — Business logic utilities (scoring, parsing, prompt building)
- `src/tracking/` — User interaction tracking
- `src/hooks/` — React custom hooks
- `src/components/` — React components
- `src/ai/` — LLM-specific logic (event formatting, trigger detection)
- `src/data/` — Static configuration and constants
- `src/main.jsx` — React entry point
## Tailwind CSS Usage
- Inline Tailwind classes in JSX (e.g., `className="flex items-center gap-2"`)
- No CSS modules or separate stylesheets
- Dynamic class names computed inline (e.g., `className={isPositive ? 'text-indigo-600' : 'text-red-500'}`)
- Semantic text sizes: `text-sm`, `text-xs`, `text-[10px]`, `text-[11px]`
- Font weights: `font-semibold`, `font-bold`, `font-mono` for monospace
- Text colors: indigo/purple for primary, red for negative, gray for neutral
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Local-first: All data persisted to IndexedDB via TinyBase, no backend required
- Reactive store: TinyBase provides auto-subscription and auto-persistence (no manual save)
- Dual-flow: LLM inference runs every ~2s (Flow A), reordering applies every 1s when user idle (Flow B)
- In-browser LLM: Gemma 4 E2B runs in WebWorker with WebGPU acceleration
- Event-sourced profiling: User intent captured via fine-grained interaction events, no catalog in LLM prompt
- Intent-aware cooldown: LLM classifies user state (exploring/deciding/focused); each state has different trigger threshold
- Confidence-weighted reranking: LLM returns confidence score (0-1) that scales final ranking formula
## Layers
- Purpose: React components for PLP grid, product cards, detail drawer, and debug panels
- Location: `src/components/`
- Contains: JSX components, icon SVGs, animations via Framer Motion
- Depends on: Hooks (useReranker, useModelLoader), data layer via repo pattern
- Used by: App.jsx (root component)
- Purpose: Orchestration of tracking → analysis → ranking pipeline
- Location: `src/hooks/useReranker.js` (dual-flow orchestrator)
- Contains: Flow A (LLM trigger every ~2s), Flow B (reorder every 1s on user idle)
- Depends on: Tracking, AI (formatter/trigger), parsing, reranking, persistence
- Used by: App.jsx for primary UI state
- Purpose: Event formatting, trigger evaluation, prompt building, response parsing
- Location: `src/ai/` and `src/lib/promptBuilder.js`, `src/lib/responseParser.js`
- Contains:
- Depends on: Tracking events, AI memory
- Used by: useReranker hook
- Purpose: Capture user interactions on PLP and drawer with anti-accidental filters
- Location: `src/tracking/trackingEngine.js`, `src/tracking/mouseActivityTracker.js`, `src/tracking/trackingConfig.js`
- Contains:
- Depends on: Tracking repo (insertEvent)
- Used by: ProductCard, ProductDrawer, useDrawerTracker hook
- Purpose: Run LLM in WebWorker, handle model loading with retry, manage lifecycle
- Location: `src/lib/modelWorker.js` (worker thread), `src/lib/modelAdapter.js`, `src/lib/adapters/transformersJsAdapter.js`
- Contains:
- Depends on: @huggingface/transformers, WebGPU API
- Used by: useModelLoader hook
- Purpose: Score products based on LLM weights and reorder by confidence-weighted formula
- Location: `src/lib/reranker.js` and `src/lib/colorFamilies.js`
- Contains:
- Depends on: Product variants and color relationships
- Used by: useReranker hook and App.jsx
- Purpose: Repository pattern encapsulating TinyBase store access
- Location: `src/db/`
- Contains:
- Depends on: TinyBase, IndexedDB
- Used by: All layers that need persistent state
- Purpose: Define LLM model, inference parameters, and capability detection
- Location: `src/data/modelConfig.js`, `src/lib/deviceCapabilities.js`
- Contains: Model selection (Qwen3 or Gemma4), dtype, device, temperature/top_p/max_tokens, timeout
- Depends on: Browser GPU/WASM capabilities
- Used by: useModelLoader, transformersJsAdapter
## Data Flow
- Product list state: useReranker's `products` (RefreshProducts updates from getProducts())
- Weights state: useReranker's `currentWeights` (updates on LLM response)
- UI state: App.jsx manages appState (loading/model_loading/browsing), drawer visibility, AI enabled flag
- User profile: aiMemory.user_profile (text, built from top weights)
- Persistent metadata: lastAnalysisAt, lastEventCount, intent, confidence, message (all in aiMemory)
## Key Abstractions
- Purpose: Abstract TinyBase access behind simple query/mutation functions
- Examples: `src/db/productsRepo.js`, `src/db/trackingRepo.js`, `src/db/aiMemoryRepo.js`
- Pattern: Each repo exports only read/write functions; never expose store directly to components
- Purpose: Create reusable event capture handlers for a product/drawer
- Examples: `createPLPTracker(productId, variants)`, `createScrollObserver(productId, element)`
- Pattern: Return handler object with named functions (onMouseEnter, onMouseLeave, onClick) ready to wire to DOM
- Purpose: Abstract LLM inference behind a single interface (load, generate, dispose)
- Examples: `TransformersJsAdapter`, potential `WebLlmAdapter`
- Pattern: Adapter encapsulates tokenizer + model; worker manages lifecycle via message protocol
- Purpose: Define color relationships and propagation rules
- Examples: Warm (rosso/arancione/giallo), Cool (blu/verde), Neutrals (nero/bianco/grigio)
- Pattern: Lookup tables (colorToFamily, shadePartners, adjacentMap) enable efficient propagation without catalog
## Entry Points
- Location: `src/main.jsx`
- Triggers: Browser load
- Responsibilities: Mount React root to DOM
- Location: `src/App.jsx`
- Triggers: React init
- Responsibilities: Initialize store, start tracking, manage app state (loading/model_loading/browsing), render layout with header/grid/footer/drawer
- Location: `src/hooks/useReranker.js`
- Triggers: App mounts; engineReady or engineReady changes
- Responsibilities: Orchestrate dual-flow (Flow A every 2s, Flow B every 1s), manage products and weights state
- Location: `src/hooks/useModelLoader.js`
- Triggers: App mounts; device capabilities check
- Responsibilities: Spawn worker, handle load with retry (max 2), expose generate callback, report progress/status
- Location: `src/components/ProductCard.jsx`
- Triggers: PLPGrid renders
- Responsibilities: Wire tracker handlers, render product image/colors, handle drawer open, preselect preferred color variant
- Location: `src/components/ProductDrawer.jsx`
- Triggers: User clicks product card
- Responsibilities: Mount drawer tracker hook, track open/close duration, variant cycling, render detail view
## Error Handling
- **LLM Inference Timeout:** 30s timeout in useModelLoader. If inference doesn't return, abort and retry prompt next cycle.
- **Model Load Failure:** Max 2 retries with exponential backoff. After retries exhausted, set status='error' and disable AI.
- **Parse Failure:** If LLM response can't be parsed (line-based or JSON), fallback to previous weights. Log parse error.
- **IndexedDB Unavailable:** Initializer catches persister error, logs warning, continues in-memory only. No persistence but app works.
- **Device Capability Check:** If WebGPU unavailable, fallback to WASM. If browser too old (no IndexedDB), set canRunModel=false.
- **Worker Crash:** useModelLoader detects worker error, terminates, retries. After max retries, disable AI inference.
- **Store Uninitialized:** All repo functions check store state before access. Empty tables return [].
- **Tracker Event Insertion:** Wrapped in try/catch; silent failure to prevent tracking errors from breaking UI.
## Cross-Cutting Concerns
- Framework: Console only (no external service)
- Approach: Phase-tagged logs (track/trigger/llm/parse/reorder/model) with icons and structured data
- File: `src/lib/logger.js` provides logger API with methods for each phase
- Consumer visibility: Logs appear in browser DevTools Console; sticky AIReasoningPanel shows latest LLM message
- LLM weights clamped to [-1.0, 1.0] in parseResponse and colorFamilies
- Confidence clamped to [0.0, 1.0]
- Intent validated to one of (exploring/deciding/focused), defaults to 'deciding'
- Color names normalized via denormalizeKey (replace underscores, trim)
- Product position indices validated on load (sort by position)
- Not applicable (local-first, no backend)
- Service Worker (Workbox 7) registers in production for offline capability
- All data persisted to IndexedDB, accessible even if network unavailable
- LLM runs entirely client-side; no API calls needed
- AI disabled if browser lacks WebGPU/WASM support
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| transformers-js | > Guide for using Transformers.js (v3+, @huggingface/transformers) to run Hugging Face ML models in the browser via ONNX Runtime. Covers pipeline() API, AutoModel/AutoTokenizer/AutoProcessor low-level API, TextStreamer, WebGPU acceleration, quantization (fp32/fp16/q8/q4/q4f16), per-module dtype, Web Worker patterns, singleton pipeline reuse, and browser model caching. Use when working with @huggingface/transformers, Transformers.js, or building client-side ML inference for tasks including: text-generation, text-classification, sentiment-analysis, NER, question-answering, summarization, translation, fill-mask, zero-shot-classification, feature-extraction, image-classification, object-detection, image-segmentation, depth-estimation, background-removal, automatic-speech-recognition, audio-classification, text-to-speech, image-to-text, document-question-answering, zero-shot-image-classification, or zero-shot-object-detection. Also use for React/Vite/Next.js integration and bundler configuration. | `.claude/skills/transformers-js/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

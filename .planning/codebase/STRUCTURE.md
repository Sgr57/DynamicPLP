# Codebase Structure

**Analysis Date:** 2026-04-14

## Directory Layout

```
DynamicPLP/
├── src/
│   ├── components/          # React UI components
│   │   └── icons/          # SVG shoe icon components
│   ├── db/                 # TinyBase data layer (repository pattern)
│   ├── ai/                 # Event formatting and trigger logic
│   ├── hooks/              # React custom hooks (useReranker, useModelLoader, etc.)
│   ├── lib/                # Utilities and business logic
│   │   └── adapters/       # LLM adapter implementations
│   ├── tracking/           # Event capture and configuration
│   ├── data/               # Configuration and static data
│   ├── assets/             # Images and static assets
│   ├── App.jsx             # Root component
│   ├── main.jsx            # React entry point
│   └── index.css           # Global Tailwind CSS
├── public/
│   ├── sw.js               # Service Worker (Workbox)
│   └── index.html          # HTML root
├── docs/                   # Documentation
├── vite.config.js          # Vite build configuration
├── package.json            # Dependencies and scripts
└── tailwind.config.js      # Tailwind CSS configuration
```

## Directory Purposes

**`src/components/`**
- Purpose: React components for the UI (PLP grid, product cards, drawer, debug panels)
- Contains: JSX files, icon SVGs, component-specific styles via Tailwind
- Key files:
  - `App.jsx`: Root component, initializes store, manages app state lifecycle
  - `PLPGrid.jsx`: Grid layout wrapper with Framer Motion LayoutGroup
  - `ProductCard.jsx`: Single product card with color swatches and click handler
  - `ProductDrawer.jsx`: Full-screen detail drawer, variant selector, close animation
  - `AIReasoningPanel.jsx`: Sticky debug overlay showing real-time LLM weights and intent
  - `ModelLoader.jsx`: Progress overlay during model load (can be full-screen or overlay)
  - `icons/`: SVG shoe silhouettes (flat, high-heel, hiking, running, etc.)

**`src/db/`**
- Purpose: Data layer encapsulation using Repository pattern
- Contains: TinyBase store initialization, CRUD functions, auto-persistence setup
- Key files:
  - `store.js`: Initializes TinyBase store, IndexedDB persister, seed from catalog
  - `productsRepo.js`: getProducts(), updatePositions() (sorts by position)
  - `trackingRepo.js`: insertEvent(), getAllEvents(), getSessionStats()
  - `aiMemoryRepo.js`: getMemoryValue(), setMemoryValue(), saveWeights(), getWeights()
- Tables in store:
  - `products`: id → {name, brand, category, price, gender, styles, position, variants}
  - `variants`: variantId → {color, hex, productId, inStock}
  - `trackingEvents`: eventId → {eventType, productId, color, duration, createdAt}
  - `aiMemory`: key → {value, updatedAt} (stores weights, intent, profile, timestamps)

**`src/ai/`**
- Purpose: LLM pipeline logic (event formatting, trigger evaluation, response parsing)
- Contains: Event→text conversion, trigger conditions, prompt building, parsing
- Key files:
  - `eventFormatter.js`: formatEvents() converts raw events to human-readable log (max 350 events sliding window)
  - `triggerEngine.js`: shouldTrigger() evaluates min interactions, cooldown, new events threshold

**`src/hooks/`**
- Purpose: React custom hooks for state management and side effects
- Key files:
  - `useReranker.js`: Dual-flow orchestrator (Flow A: LLM every 2s, Flow B: reorder every 1s)
  - `useModelLoader.js`: Worker lifecycle, model load with retry, generate callback
  - `useDrawerTracker.js`: Tracks open/close duration, variant cycling in drawer
  - `useOfflineStatus.js`: Monitors online/offline status

**`src/lib/`**
- Purpose: Utilities and business logic (LLM inference, reranking, prompting, parsing)
- Key files:
  - `reranker.js`: rankProducts() with composite score formula
  - `colorFamilies.js`: Color definitions, propagateColorWeights() for related colors
  - `promptBuilder.js`: buildPrompt() assembles system prompt, fewshot, user events
  - `responseParser.js`: parseResponse() line-based + JSON fallback parsing
  - `modelAdapter.js`: Factory to create TransformersJsAdapter instance
  - `modelWorker.js`: Web Worker entry point, message protocol handler
  - `adapters/transformersJsAdapter.js`: LLM adapter wrapping @huggingface/transformers API
  - `deviceCapabilities.js`: getDeviceCapabilities() checks WebGPU/WASM support
  - `logger.js`: Structured logging API with phase-tagged console output
  - `jsonParser.js`: Utility for JSON parsing with fallback
  - `dbExporter.js`: exportData() for debugging (dumps store to JSON)

**`src/tracking/`**
- Purpose: Event capture configuration and handlers
- Key files:
  - `trackingConfig.js`: TRACKING_CONFIG object (event types, enabled/disabled, thresholds, cooldowns)
  - `trackingEngine.js`: createPLPTracker(), createScrollObserver(), trackCardRevisit() factories
  - `mouseActivityTracker.js`: startMouseTracking(), stopMouseTracking(), isUserIdle()

**`src/data/`**
- Purpose: Configuration and static data
- Key files:
  - `products.json`: Product catalog with categories, styles, variants, colors
  - `modelConfig.js`: MODEL_CONFIG object (model selection, inference params, timeout)

**`src/assets/`**
- Purpose: Static images and files
- Contains: Product images, shoe pattern SVGs, etc.

**`public/`**
- Purpose: Static files served directly
- Contains:
  - `index.html`: HTML root with <div id="root"> for React mount
  - `sw.js`: Service Worker (Workbox-generated or hand-written for offline)

**`docs/`**
- Purpose: Project documentation
- Key files:
  - `SCORING_FLOW.md`: Detailed scoring formula, color propagation, confidence multiplier

## Key File Locations

**Entry Points:**
- `src/main.jsx`: React root mount (calls ReactDOM.createRoot)
- `src/App.jsx`: App component, initializes store, renders layout
- `public/index.html`: HTML root with <div id="root">
- `public/sw.js`: Service Worker for offline

**Configuration:**
- `vite.config.js`: Vite build config (HMR, output)
- `package.json`: Dependencies, scripts (npm run dev, build, preview)
- `tailwind.config.js`: Tailwind CSS customization
- `tsconfig.json`: (Not used; project is JavaScript, no TypeScript)

**Core Logic:**
- `src/db/store.js`: TinyBase store initialization and seeding
- `src/hooks/useReranker.js`: Main orchestration (dual-flow)
- `src/lib/modelWorker.js`: LLM inference worker
- `src/tracking/trackingEngine.js`: Event capture factories

**Testing:** None detected (no .test.js, .spec.js, or test runner config)

## Naming Conventions

**Files:**
- Component files: PascalCase (e.g., `ProductCard.jsx`, `AIReasoningPanel.jsx`)
- Utility/hook files: camelCase (e.g., `trackingEngine.js`, `useReranker.js`)
- Config files: camelCase (e.g., `trackingConfig.js`, `modelConfig.js`)
- Data files: kebab-case (e.g., `products.json`)
- Directories: lowercase (e.g., `components`, `db`, `ai`, `hooks`)

**Directories:**
- UI components: plural (e.g., `components`, `hooks`)
- Functional/feature dirs: singular (e.g., `db`, `ai`, `lib`, `tracking`, `data`)
- Subdirs for grouping: lowercase, plural if multiple items (e.g., `icons`, `adapters`)

**Code Identifiers:**
- React components: PascalCase (e.g., `ProductCard`, `PLPGrid`)
- React hooks: camelCase with "use" prefix (e.g., `useReranker`, `useModelLoader`)
- Functions: camelCase (e.g., `rankProducts`, `formatEvents`, `buildPrompt`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `TRACKING_CONFIG`, `MODEL_CONFIG`, `MAX_EVENTS`)
- Classes: PascalCase (e.g., `TransformersJsAdapter`)
- Objects/instances: camelCase (e.g., `store`, `logger`, `persister`)

## Where to Add New Code

**New Feature (e.g., filtering, sorting):**
- Primary code: `src/lib/` or `src/hooks/` depending on logic complexity
- UI components: `src/components/`
- Config: `src/data/` if static, `src/tracking/trackingConfig.js` if behavior-related
- Tests: Create `src/__tests__/` directory with matching structure

**New Component:**
- Implementation: `src/components/ComponentName.jsx`
- Icon or subcomponent: `src/components/icons/` if visual asset
- Hook if stateful: `src/hooks/useComponentName.js`
- Tailwind classes: Inline in JSX (no separate CSS files)

**New Database Table:**
- Schema setup: Modify `src/db/store.js` seedProducts() to add table
- Repo functions: Create `src/db/newEntityRepo.js` with getters/setters
- Import repo in components: Never access store directly, only via repo

**New Tracker Event Type:**
- Configuration: Add to `TRACKING_CONFIG` in `src/tracking/trackingConfig.js`
- Handler: Add handler in `trackingEngine.js` factory function
- Label: Include label for LLM prompt in eventFormatter

**Utilities:**
- Shared helpers: `src/lib/utilities.js` or specific file like `src/lib/colorFamilies.js`
- Math/scoring: `src/lib/` (e.g., `reranker.js`)
- Logging: `src/lib/logger.js` (extend logger object)

## Special Directories

**`src/lib/adapters/`**
- Purpose: LLM adapter implementations (swap-able)
- Generated: No
- Committed: Yes
- Contains:
  - `transformersJsAdapter.js`: Current adapter using @huggingface/transformers
  - `webLlmAdapter.js`: Alternative adapter (stub, not used)
- Usage: `modelAdapter.js` dynamically imports the active adapter

**`public/`**
- Purpose: Static assets served directly by Vite dev server / bundled in production
- Generated: `sw.js` is hand-written (could be Workbox-generated)
- Committed: Yes
- Contains: index.html, sw.js, any images or fonts

**`.planning/codebase/`**
- Purpose: GSD analysis documents
- Generated: Manually created by codebase mapper
- Committed: Yes (consumed by gsd-plan-phase and gsd-execute-phase)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`node_modules/`**
- Purpose: Installed dependencies
- Generated: Yes (npm install)
- Committed: No (.gitignored)

**`dist/`**
- Purpose: Production build output
- Generated: Yes (npm run build)
- Committed: No (.gitignored)

---

*Structure analysis: 2026-04-14*

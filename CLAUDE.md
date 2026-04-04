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

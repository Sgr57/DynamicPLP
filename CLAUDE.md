# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DynamicPLP is a **Local First** proof-of-concept: an AI-powered Product Listing Page (PLP) for a shoe e-commerce that personalizes product order in real-time using an LLM running entirely in the browser. All data (catalog, behavior tracking, AI memory) lives in TinyBase with IndexedDB auto-persistence — no backend, no data leaves the device.

## Tech Stack

- **React 18** + **Vite 5** + **Tailwind CSS 3** + **Framer Motion 11**
- **TinyBase** (~10 KB) reactive tabular store with IndexedDB auto-persist
- **@mlc-ai/web-llm** with Llama 3.2 1B for in-browser inference via WebGPU
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
2. **statsAggregator** (`src/ai/`) applies **dual decay** (temporal half-life 120s + quantitative every 15 events) and **per-product caps** (max 25 pts/product), aggregates into color/style/category affinities. Two modes: `aggregateStats()` (unanalyzed only, for pipeline) and `aggregateAllStats()` (all events, for debug)
3. **triggerEngine** (`src/ai/`) evaluates trigger conditions: ≥10 interactions, ≥8s inactivity, ≥30s cooldown, significant delta (>2 points vs last snapshot)
4. **promptBuilder** assembles: system prompt + aggregated stats + delta from last analysis + user profile (~980 tokens total, **no catalog in prompt**)
5. **WebLLM** returns JSON with continuous weights (-1.0 to 1.0) for colors/styles/categories + structured user profile ([TOP]/[TREND]/[CONF])
6. **reranker** scores each product: `colorScore×40 + styleScore×20 + categoryScore×30 + stockBonus×5` → updates `position` in TinyBase store
7. **PLPGrid** re-renders with Framer Motion layout animations + **preselects preferred color variant** on each card

> Full flow documentation with formulas and tables: [`docs/SCORING_FLOW.md`](docs/SCORING_FLOW.md)

### Key Design Decisions

- **Stats-based profiling**: LLM receives aggregated behavioral statistics, not raw events or catalog. The catalog never enters the prompt.
- **Dual decay**: temporal (half-life 120s) + quantitative (every 15 events, factor 0.7) ensures both time-based and volume-based "change of mind" detection.
- **Per-product caps**: prevents products with many variants from dominating affinities (25 pts total, 12/color, 10/style, 15/category).
- **Color preselection**: after reranking, ProductCards auto-select the variant matching the user's preferred color.
- **Smart trigger**: delta significance check prevents redundant LLM calls when user explores same patterns.
- **Pre-personalized startup**: `last_weights` in `aiMemory` allows the PLP to load with the last known ranking before the LLM is ready.
- **Debug overlay**: real-time affinities, LLM weights, and user profile visible in the sticky AI panel.
- **Auto-persistence**: TinyBase IndexedDB persister handles all persistence automatically.
- Tracking config (weights, thresholds, decay, caps) is centralized in `trackingConfig.js`.

## Browser Requirements

WebGPU (Chrome 113+) is required for the LLM. IndexedDB (all modern browsers) is used for persistence.

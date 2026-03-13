# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DynamicPLP is a **Local First** proof-of-concept: an AI-powered Product Listing Page (PLP) for a shoe e-commerce that personalizes product order in real-time using an LLM running entirely in the browser. All data (catalog, behavior tracking, AI memory) lives in SQLite via OPFS — no backend, no data leaves the device.

## Tech Stack

- **React 18** + **Vite 5** + **Tailwind CSS 3** + **Framer Motion 11**
- **sql.js** (SQLite WASM) with OPFS persistence for all data
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

Single SQLite file `plp_demo.db` in OPFS with 5 tables: `products`, `variants`, `tracking_events`, `ai_memory`, `schema_migrations`. The **Repository pattern** (`src/db/*Repo.js`) encapsulates all SQL — components never call sql.js directly. `dbManager.js` is the singleton that handles OPFS init, migrations, and persistence (debounced writes).

### Tracking → LLM → Re-ranking Pipeline

1. **trackingEngine** captures user interactions (hover, click, scroll) → writes to `tracking_events` via `trackingRepo`
2. **behaviorSnapshot** reads unanalyzed events (`analyzed = 0`), applies temporal decay, aggregates into a behavioral delta
3. **promptBuilder** assembles: system prompt + compressed catalog (via `budgetAllocator`) + user profile from `ai_memory` + behavioral delta
4. **WebLLM** returns JSON with preferred colors/styles/product boosts + updated user profile
5. **reranker** scores products deterministically from LLM preferences → updates `position` column in SQLite
6. **PLPGrid** re-renders with Framer Motion layout animations

### Key Design Decisions

- **Delta-only analysis**: LLM receives only `analyzed = 0` events, not full history. After inference, events are marked `analyzed = 1` (never deleted).
- **Pre-personalized startup**: `last_response` in `ai_memory` allows the PLP to load with the last known ranking before the LLM is ready.
- **OPFS fallback**: If OPFS is unavailable, db runs in-memory with localStorage fallback for AI memory.
- **Context window budget**: `budgetAllocator.js` compresses catalog data across 4 levels based on available context window size.
- Tracking config (weights, thresholds, decay) is centralized in `trackingConfig.js`.

## Browser Requirements

WebGPU (Chrome 113+) is required for the LLM. OPFS (Chrome 102+) is required for persistence.

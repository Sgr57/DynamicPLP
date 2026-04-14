# External Integrations

**Analysis Date:** 2026-04-14

## APIs & External Services

**Hugging Face Hub:**
- Service: Hugging Face Model Hub
- What it's used for: Model weight downloads for LLM inference
  - Primary model: `onnx-community/gemma-4-E2B-it-ONNX`
  - Alternative model: `onnx-community/Qwen3-0.6B-ONNX`
  - Model format: ONNX (Open Neural Network Exchange)
  - Tokenizer: AutoTokenizer from `@huggingface/transformers`
- SDK/Client: `@huggingface/transformers` 4.0.1
- How accessed: Direct HTTP downloads from Hugging Face CDN during model loading
- No authentication required for public models

**Browser APIs (No External Service Dependency):**
- WebGPU API - Device-level GPU acceleration (not an external service)
- IndexedDB - Browser local storage (not external)
- Service Worker API - Offline caching (not external)

## Data Storage

**Local Storage Only:**
- Database: TinyBase with IndexedDB persistence
  - Name: `plp_demo`
  - Tables: `products`, `variants`, `trackingEvents`, `aiMemory`
  - Implementation: `src/db/store.js`
  - Persister: IndexedDB via `tinybase/persisters/persister-indexed-db`
  - Location: Browser IndexedDB
- No remote database
- No external data sync

**File Storage:**
- Local filesystem only (IndexedDB)
- Catalog JSON embedded: `src/data/products.json`
- No cloud file storage

**Caching:**
- Browser Cache API via Service Worker
  - Static assets precaching via Workbox
  - JS, CSS, fonts cached with `CacheFirst` strategy
  - No external cache service

## Authentication & Identity

**Auth Provider:**
- None - Local-first architecture
- No user authentication required
- No identity management
- All user data stored locally in browser

## Monitoring & Observability

**Error Tracking:**
- None - Local-first application
- No error reporting service

**Logs:**
- In-memory console logs only
- Logger: `src/lib/logger.js`
- No external log aggregation
- Debug output: `AIReasoningPanel` component displays real-time stats
- Exportable via `src/lib/dbExporter.js` (JSON export)

**Performance Monitoring:**
- Built-in performance measurements (no external service):
  - Model loading time via `performance.now()`
  - Inference latency tracking
  - No external APM tool

## CI/CD & Deployment

**Hosting:**
- Static hosting (any provider supporting SPAs)
- Recommended: Vercel, Netlify, Cloudflare Pages, GitHub Pages
- Requirements: COOP/COEP header support (HTTPS, modern hosting)

**CI Pipeline:**
- None detected - local development only
- Can be configured at deployment platform level

## Environment Configuration

**Required env vars:**
- None - application requires no environment variables
- All configuration is embedded or localStorage-based

**Secrets location:**
- No secrets management needed
- Application is fully client-side

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Model Loading & Inference

**Model Loading Pipeline:**
- Hugging Face Hub → Browser cache → IndexedDB (optional offline cache)
- Model format: ONNX quantized weights (Q4F16 quantization)
- Inference device: WebGPU (preferred) or WASM fallback
- Execution environment: Web Worker (`src/lib/modelWorker.js`)
- Model adapter: `src/lib/adapters/transformersJsAdapter.js`
- Timeouts: 30s inference timeout, 2 retries with max backoff

**Model Loading Status Tracking:**
- Progress reported via: `src/hooks/useModelLoader.js`
- Component: `src/components/ModelLoader.jsx`
- States: idle → loading → ready/error
- Fallback to WASM if WebGPU unavailable

## Browser APIs Used

**Critical for Operation:**
- `navigator.gpu` - WebGPU adapter detection
- `navigator.onLine` - Offline status detection (`src/hooks/useOfflineStatus.js`)
- `SharedArrayBuffer` - Multi-threaded WASM support
- `IndexedDB` - Local data persistence
- `Service Worker API` - Offline capability
- `Workers API` - Model inference in background thread

**Graceful Degradation:**
- WebGPU unavailable → WASM fallback (slower but works)
- SharedArrayBuffer unavailable → Error state (cannot run model)
- IndexedDB unavailable → In-memory fallback (`src/db/store.js` line 47-49)
- Service Worker unavailable → Normal functionality, no offline support

## Data Flow Summary

1. **Initialization**: Load products from `src/data/products.json` → TinyBase
2. **User Interaction**: Events captured → `trackingEvents` table
3. **Analysis Trigger**: triggerEngine evaluates conditions → triggers LLM
4. **LLM Inference**: 
   - Event log formatted via `eventFormatter`
   - Prompt built via `promptBuilder` (Italian language)
   - Inference via `modelWorker` (Gemma 4 E2B via Transformers.js)
   - Response parsed via `responseParser`
5. **Reranking**: Weights propagated via `colorFamilies` → `reranker` scores products
6. **Rendering**: PLPGrid applies Framer Motion animations
7. **Persistence**: All changes auto-saved to IndexedDB

## Notes

- **No external dependencies for core functionality** - All external integrations are for model weights only
- **Fully offline capable** - After initial model download, operates completely offline
- **HTTPS requirement** - Due to Service Worker and SharedArrayBuffer
- **Browser capabilities critical** - Success depends on WebGPU or WASM support
- **Model selection**: Switch active model in `src/data/modelConfig.js` line 18

---

*Integration audit: 2026-04-14*

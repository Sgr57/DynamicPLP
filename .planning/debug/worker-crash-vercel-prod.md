---
status: fix_applied
trigger: "Web Worker crashes on Vercel production with opaque error Event. Model loading fails after 2 retries. Works locally."
created: 2026-04-15
updated: 2026-04-15
---

# Debug Session: worker-crash-vercel-prod

## Symptoms

- **Expected:** Model loads in Worker on Vercel production, same as localhost
- **Actual:** Worker fires `onerror` with opaque `Event { type: 'error' }` — no message, no stack. Retries 1/2 and 2/2 also fail.
- **Error:** `[PLP] model ✗ Event {isTrusted: true, type: 'error', target: Worker}` — three times (initial + 2 retries)
- **Timeline:** Unknown if existed before COOP/COEP fix. SharedArrayBuffer warning is now gone (fix worked). Worker crash is separate issue.
- **Reproduction:** Deploy to Vercel, open site in Chrome. Model loading starts, Worker crashes immediately.
- **Scope:** Only on Vercel production. Local dev server works fine.

## Evidence

- timestamp: 2026-04-15 — SW precache manifest included modelWorker-*.js and transformersJsAdapter-*.js (7 entries, 907KB)
- timestamp: 2026-04-15 — SW CacheFirst route matched all .js files including Worker scripts and their module imports
- timestamp: 2026-04-15 — Dev mode has no Service Worker; production build activates SW with precache + CacheFirst for .js
- timestamp: 2026-04-15 — Worker uses ES module format (type:'module') with dynamic import() for 500KB adapter chunk
- timestamp: 2026-04-15 — ONNX Runtime inside adapter spawns pthread sub-workers using import.meta.url and loads .mjs/.wasm from jsDelivr CDN
- timestamp: 2026-04-15 — Opaque Event (no message) is characteristic of Worker script load/evaluation failure, not runtime errors

## Current Focus

- hypothesis: Service Worker CacheFirst strategy intercepting module Worker script and its dynamic imports causes Chrome module loader to reject cached Response objects, producing opaque error
- test: Remove .js from CacheFirst route; exclude Worker files from precache manifest
- expecting: Worker loads directly from network, bypassing SW cache interference
- next_action: deploy to Vercel and verify Worker loads successfully

## Resolution

- root_cause: Service Worker interference with ES module Worker loading. The SW had a CacheFirst route matching all .js files, which intercepted both the Worker script fetch and its dynamic import() of the 500KB ONNX adapter chunk. Chrome's module Worker loader has strict requirements for Response objects that SW-cached responses may not satisfy, causing opaque errors. Additionally, both files were in the precache manifest, meaning the SW precache strategy also competed to serve them.
- fix: (1) Removed .js from SW CacheFirst route pattern (now only .css and .woff/.woff2). (2) Added globIgnores for modelWorker-*.js and transformersJsAdapter-*.js in vite-plugin-pwa config to exclude them from precache. (3) Improved worker.onerror handler to extract diagnostic info from ErrorEvent vs opaque Event.
- files_changed: sw.js, vite.config.js, src/hooks/useModelLoader.js

---
status: complete
---

# Quick Task 260415-ms1: Summary

## What was done

1. **Created `vercel.json`** with COOP (`same-origin`) and COEP (`credentialless`) headers on all routes `/(.*)`
2. **Updated `vite.config.js`** — changed COEP from `require-corp` to `credentialless` in both `server.headers` and `preview.headers`; updated comment explaining rationale and referencing `vercel.json`
3. **Verified** build succeeds and preview server returns correct headers

## Root Cause

`vite.config.js` set COOP/COEP headers only for Vite dev server and preview server. No `vercel.json` existed to configure these headers on Vercel production. Without headers, browser blocks `SharedArrayBuffer` → `deviceCapabilities.js` returns `canRunModel=false` → warning displayed.

## Key Decision

Used `credentialless` instead of `require-corp` for COEP — safer for cross-origin fetches to HuggingFace CDN (model downloads, chat_template.jinja) which may not send CORP headers.

## Commits

- `e96c72b` feat(260415-ms1): add vercel.json with COOP/COEP headers for SharedArrayBuffer
- `13a7b38` fix(260415-ms1): align vite dev/preview COEP to credentialless

## Human Verification Needed

After Vercel deploy:
```bash
curl -sI https://dynamic-plp.vercel.app/ | grep -i 'cross-origin'
```
Expected: `cross-origin-opener-policy: same-origin` and `cross-origin-embedder-policy: credentialless`

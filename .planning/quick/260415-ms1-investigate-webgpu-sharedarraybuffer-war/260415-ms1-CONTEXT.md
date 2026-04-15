# Quick Task 260415-ms1: WebGPU/SharedArrayBuffer Warning on Vercel - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Task Boundary

Production at https://dynamic-plp.vercel.app/ shows warning "Questo dispositivo non supporta WebGPU o SharedArrayBuffer" while localhost works fine. Root cause: missing COOP/COEP headers on Vercel. vite.config.js sets headers only for dev server and preview, not production hosting.

</domain>

<decisions>
## Implementation Decisions

### COEP Policy Strictness
- Use `credentialless` instead of `require-corp`
- Why: safer for cross-origin fetches to HuggingFace CDN (model downloads, chat_template.jinja fetch). `credentialless` enables SharedArrayBuffer without requiring remote servers to send CORP headers.

### Header Scope
- Apply headers to all routes (`/**` or equivalent)
- Why: SPA with single entry point, all routes need SharedArrayBuffer for LLM inference.

### External Resource Impact
- `credentialless` resolves this — cross-origin fetches (HuggingFace CDN for model files, tokenizer, chat_template) work without CORP header from remote server.
- No external fonts or images from third-party CDNs detected in codebase.

</decisions>

<specifics>
## Specific Ideas

- Create `vercel.json` with COOP/COEP headers for all routes
- Update `vite.config.js` comment to note `credentialless` choice for production
- Consider aligning dev server to also use `credentialless` for consistency

</specifics>

<canonical_refs>
## Canonical References

- `vite.config.js:12-19` — current dev/preview header configuration
- `src/lib/deviceCapabilities.js` — capability detection that triggers the warning
- `src/lib/adapters/transformersJsAdapter.js:70-88` — cross-origin fetch to HuggingFace
- MDN: Cross-Origin-Embedder-Policy `credentialless` — enables SharedArrayBuffer with relaxed cross-origin requirements

</canonical_refs>

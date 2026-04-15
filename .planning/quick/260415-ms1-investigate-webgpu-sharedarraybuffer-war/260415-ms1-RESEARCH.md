# Quick Task 260415-ms1: WebGPU/SharedArrayBuffer Warning — Research

**Researched:** 2026-04-15
**Domain:** HTTP security headers, Vercel deployment configuration
**Confidence:** HIGH

## Summary

The warning "Questo dispositivo non supporta WebGPU o SharedArrayBuffer" on Vercel production (not localhost) is caused by `SharedArrayBuffer` being `undefined` in the browser. Modern browsers gate `SharedArrayBuffer` behind cross-origin isolation, which requires two HTTP response headers: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` (or `require-corp`). Vite's `server.headers` and `preview.headers` settings only apply to the Vite dev server and `vite preview` — they have no effect on Vercel production hosting.

`credentialless` is the correct COEP value for this project because the app fetches model files, tokenizers, and `chat_template.jinja` from HuggingFace CDN at runtime. With `require-corp`, those fetches would be blocked unless HuggingFace sends `Cross-Origin-Resource-Policy` headers (which it may not always do). With `credentialless`, no-cors cross-origin requests are sent without cookies, which is exactly what model downloads need.

**Primary recommendation:** Create `vercel.json` at project root with COOP/COEP headers on `/(.*)`; optionally align Vite dev server from `require-corp` to `credentialless`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use `credentialless` for COEP (not `require-corp`)
- Apply headers to all routes (`/**` or equivalent)

### Specific Ideas
- Create `vercel.json` with COOP/COEP headers for all routes
- Update `vite.config.js` comment to note `credentialless` choice
- Align dev server to also use `credentialless` for consistency

### Out of Scope
- Nothing explicitly deferred
</user_constraints>

---

## 1. Correct vercel.json Format

Vercel's `headers` array uses `source` as a path pattern. Two patterns cover all routes for a SPA:

- `"/(.*)"` — regex-style wildcard (matches everything including root)
- `"/:path*"` — named param wildcard (also matches everything)

Both are valid. Vercel docs use `/(.*)`  in their canonical security headers example.

[VERIFIED: vercel.com/docs/project-configuration/vercel-json]

**Correct structure:**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "credentialless"
        }
      ]
    }
  ]
}
```

This file must be placed at the project root (same level as `package.json`).

**Service worker consideration:** Vite PWA docs recommend a separate rule for the SW file with no-cache headers. If you add that alongside the COOP/COEP rule, the `sw.js`-specific rule must come **before** the wildcard rule to take precedence, or you can put them both under the same wildcard rule. The COOP/COEP headers apply to the SW response itself — this is fine and expected; the browser requires the SW script to be served from the same origin (which it is), so cross-origin isolation policies don't block SW registration.

---

## 2. `credentialless` Browser Compatibility

[VERIFIED: caniuse.com/mdn-http_headers_cross-origin-embedder-policy_credentialless]

| Browser | Support Since | Notes |
|---------|--------------|-------|
| Chrome  | 96 (2021)    | Full support — this PoC targets Chrome 113+ |
| Edge    | 96 (2021)    | Full support |
| Firefox | 119 (2023)   | Full support |
| Safari  | Not supported | No support across all versions as of 2026 |

**Conclusion for this PoC:** `credentialless` is correct. The project already requires Chrome 113+ for WebGPU. Safari users can't run the LLM anyway (no WebGPU), so the lack of Safari support for `credentialless` is irrelevant — Safari users will hit the capability check and see the warning regardless of header policy.

---

## 3. Vercel-Specific Gotchas

**No known gotchas for static site header injection.**

[VERIFIED: vercel.com/docs/project-configuration/vercel-json]

- Headers in `vercel.json` are applied by Vercel's CDN edge layer to all matching responses, including the HTML entry point, JS chunks, and the service worker file.
- There is no conflict between setting COOP/COEP on the SW script response and SW registration — the browser checks same-origin for SW scope, not CORP/COEP policy on the script itself.
- Vercel does not strip or override COOP/COEP headers for static deployments.
- Caching: Vercel's CDN respects `Cache-Control` headers you set. COOP/COEP headers don't interfere with caching — they're response headers that the browser reads but the CDN passes through.

**One subtlety:** If you later add `<iframe>` embeds or load cross-origin scripts with `require-corp`, those would break. `credentialless` avoids this by sending no-cors requests without credentials instead of requiring CORP on the remote. Since HuggingFace model fetches are `fetch()` calls (not iframes), `credentialless` handles them correctly.

---

## 4. Aligning Vite Dev Server to `credentialless`

Current `vite.config.js` uses `require-corp` for both `server.headers` and `preview.headers`.

**Should this be updated?**

- The behavior difference: with `require-corp`, any cross-origin resource fetched without credentials must have a `Cross-Origin-Resource-Policy` header from the remote server. HuggingFace CDN does serve CORP headers for model files in most cases, so `require-corp` may work in practice on localhost.
- However, for consistency with production (which will use `credentialless`) and to avoid any subtle difference in dev vs. prod behavior, aligning to `credentialless` is recommended.
- Risk of changing: minimal — `credentialless` is strictly more permissive than `require-corp`. No dev-only behavior will break.

**Recommendation:** Change both `server.headers` and `preview.headers` in `vite.config.js` from `require-corp` to `credentialless`.

---

## What to Build

Two file changes, no new dependencies:

1. **Create** `vercel.json` at project root with COOP/COEP headers for `/(.*)`
2. **Edit** `vite.config.js` lines 18 and 25: change `require-corp` to `credentialless` in both `server.headers` and `preview.headers`; update the comment to explain the choice

No install steps, no environment variables, no service changes.

---

## Sources

- [VERIFIED: vercel.com/docs/project-configuration/vercel-json] — canonical `headers` array format and source pattern examples
- [VERIFIED: caniuse.com — COEP credentialless] — Chrome 96+, Firefox 119+, Safari: none
- [CITED: developer.chrome.com/blog/coep-credentialless-origin-trial] — `credentialless` semantics and HuggingFace CDN compatibility rationale
- [CITED: vite-pwa-org.netlify.app/deployment/vercel] — SW Cache-Control header recommendation
- [ASSUMED] HuggingFace CDN CORP headers: assumed that `credentialless` resolves any CORP issues; not tested against production HuggingFace endpoints in this session

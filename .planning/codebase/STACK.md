# Technology Stack

**Analysis Date:** 2026-04-14

## Languages

**Primary:**
- JavaScript (JSX) - All source code, components, and business logic
- No TypeScript

**Secondary:**
- HTML - Entry points
- CSS - Styles processed via PostCSS/Tailwind

## Runtime

**Environment:**
- Node.js (development only)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present, v3)

## Frameworks

**Core:**
- React 18.3.0 - UI library, component-based architecture
- Vite 5.4.0 - Build tool and development server
- Vite PWA Plugin 1.2.0 - Progressive Web App configuration

**Styling:**
- Tailwind CSS 3.4.0 - Utility-first CSS framework
- PostCSS 8.4.0 - CSS transformation pipeline
- Autoprefixer 10.4.0 - Browser vendor prefix automation

**UI & Animation:**
- Framer Motion 11.0.0 - React animation library for layout animations and transitions

## Key Dependencies

**Critical:**
- `@huggingface/transformers` 4.0.1 - In-browser LLM inference library (Transformers.js)
  - Enables WebGPU execution via ONNX Runtime
  - Downloads model weights from Hugging Face Hub
- `tinybase` 5.0.0 - Local-first reactive tabular store with IndexedDB persistence
  - Reactive data management without backend
  - Auto-persists to IndexedDB
- `lodash` 4.17.21 - Utility library for functional programming patterns

**Infrastructure:**
- `workbox-precaching` 7.4.0 - Service worker asset caching
- `workbox-routing` 7.4.0 - Service worker request routing
- `workbox-strategies` 7.4.0 - Service worker caching strategies
- `@vitejs/plugin-react` 4.3.0 - Vite React plugin with JSX support

## Configuration

**Environment:**
- No `.env` file required (local-first architecture)
- All configuration is compile-time or stored in TinyBase
- Model selection: `src/data/modelConfig.js`
- Tracking config: `src/tracking/trackingConfig.js`
- Color propagation: `src/lib/colorFamilies.js`

**Build:**
- Vite config: `vite.config.js`
  - Rollup multi-entry points: `index.html` (main), `sandbox.html` (testing)
  - Worker format: ES modules
  - COOP/COEP headers enabled for SharedArrayBuffer (WebGPU)
  - Dependency exclusion: `@huggingface/transformers` (requires custom loading)
- PostCSS config: `postcss.config.js`
- Tailwind config: `tailwind.config.js`
  - Custom animations: shimmer, aurora, sparkle-rise, star-glow, border-sweep

**Service Worker:**
- Manifest injection: `vite-plugin-pwa` injects Workbox manifest
- SW file: `sw.js`
- Precaching strategy: Precache and route
- Static asset caching: `static-cache` (JS, CSS, fonts)

## Platform Requirements

**Development:**
- Node.js (any recent version)
- npm or compatible package manager

**Production:**
- Modern browser with WebGPU support (Chrome 113+)
- IndexedDB support (all modern browsers)
- SharedArrayBuffer support (required for WASM ONNX Runtime multi-threading)
- Service Worker support (all modern browsers)

**Deployment:**
- Static hosting (Vercel, Netlify, Cloudflare, GitHub Pages, etc.)
- COOP/COEP header configuration required at host level
- Must be served over HTTPS for Service Worker

## Notes

- **Local-first**: No external backend, API, or CDN dependencies beyond Hugging Face model hub
- **Model inference**: Runs entirely in browser via Web Worker
- **Data storage**: All persistence via TinyBase + IndexedDB, no database backend
- **Offline capable**: Full offline functionality after initial load via Service Worker
- **WebGPU requirement**: While WebGPU preferred, fallback to WASM is available

---

*Stack analysis: 2026-04-14*

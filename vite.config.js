import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  worker: {
    format: 'es',
  },
  // COOP/COEP headers enable SharedArrayBuffer for ONNX Runtime multi-thread WASM.
  // Using 'credentialless' (not 'require-corp') so cross-origin fetches to HuggingFace
  // CDN work without requiring CORP headers from the remote server.
  // Production headers are configured in vercel.json (must match these values).
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: '.',
      filename: 'sw.js',
      injectRegister: 'auto',
      injectManifest: {
        // Exclude Worker scripts and their heavy dependencies from precache.
        // Module Workers served from SW cache can fail in Chrome with opaque
        // errors. The Worker and ONNX adapter are loaded on-demand from the
        // network instead.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/modelWorker-*.js', '**/transformersJsAdapter-*.js'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
})

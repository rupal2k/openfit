import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = process.env.API_TARGET || 'http://127.0.0.1:3000'
const media = process.env.MEDIA_TARGET || 'http://127.0.0.1:8888'

// transformers.js loads ONNX Runtime's 27 MB wasm from jsDelivr (pinned to the bundled
// onnxruntime-web version) and caches it on first use; onnxruntime-web's own fallback
// `new URL('…wasm', import.meta.url)` makes Vite emit a copy nothing loads. Drop it so the
// APK and the PWA don't carry 27 MB of dead weight.
const dropUnusedOrtWasm = {
  name: 'drop-unused-ort-wasm',
  apply: 'build',
  generateBundle(_, bundle) { for (const k of Object.keys(bundle)) if (/ort-wasm[^/]*\.wasm$/.test(k)) delete bundle[k] },
}

export default defineConfig({
  plugins: [react(), dropUnusedOrtWasm],
  base: './',
  server: {
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/img': { target: media, changeOrigin: true },
      '/gif': { target: media, changeOrigin: true }
    }
  },
  build: { chunkSizeWarningLimit: 1500 }
})

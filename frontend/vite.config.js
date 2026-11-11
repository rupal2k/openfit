import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

// On-device OCR for photographed and scanned lab reports (lib/labs/ocr.js). The Tesseract worker,
// its SIMD core and the English model ship inside the app under ocr/, so OCR never fetches
// anything: dev serves them from node_modules, the build emits them as plain files.
const OCR_FILES = {
  'worker.min.js': 'tesseract.js/dist/worker.min.js',
  'tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'eng.traineddata.gz': '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
}
const ocrPath = f => fileURLToPath(new URL('./node_modules/' + OCR_FILES[f], import.meta.url))
const ocrAssets = {
  name: 'ocr-assets',
  configureServer(server) {
    server.middlewares.use('/ocr/', (req, res, next) => {
      const f = decodeURIComponent((req.url || '').split('?')[0].replace(/^\//, ''))
      if (!OCR_FILES[f]) return next()
      res.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
      res.end(readFileSync(ocrPath(f)))
    })
  },
  generateBundle() {
    for (const f of Object.keys(OCR_FILES)) this.emitFile({ type: 'asset', fileName: 'ocr/' + f, source: readFileSync(ocrPath(f)) })
  },
}

export default defineConfig({
  plugins: [react(), dropUnusedOrtWasm, ocrAssets],
  // shown in Settings, so a phone can tell which build it runs
  define: { __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version) },
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

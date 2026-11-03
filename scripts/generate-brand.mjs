// Regenerates every brand asset from assets/icon-source.png (the 1254×1254 master icon):
// README banner, assets/logo.png, PWA + website icons, Android launcher/splash, iOS icon/splash.
// Usage: node scripts/generate-brand.mjs   (needs frontend/node_modules — run `npm install` there first)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sharp = createRequire(import.meta.url)(path.join(R, 'frontend/node_modules/sharp'))
const SRC = path.join(R, 'assets/icon-source.png'), BG = '#0d1117'
;(async () => {
  // the source is a rounded-square icon on a transparent background: trim the margin, centre it on a square
  const trimmed = await sharp(SRC).ensureAlpha().trim({ threshold: 10 }).png().toBuffer()
  const master = await sharp(trimmed).resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  const out = (size, file) => sharp(master).resize(size, size).png().toFile(path.join(R, file))
  await out(1024, 'assets/logo.png')
  for (const d of ['frontend/public', 'website']) { await out(512, d + '/icon-512.png'); await out(180, d + '/icon-180.png') }
  await out(64, 'frontend/public/favicon.png')
  // iOS icons must be opaque; iOS applies its own corner mask
  await sharp(master).flatten({ background: BG }).png().toFile(path.join(R, 'frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'))
  // Android launcher: legacy square + round, adaptive foreground/background
  const res = path.join(R, 'frontend/android/app/src/main/res') + '/'
  for (const [k, m] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    const L = Math.round(48 * m), F = Math.round(108 * m), dir = res + 'mipmap-' + k + '/'
    await sharp(master).resize(L, L).png().toFile(dir + 'ic_launcher.png')
    await sharp(master).resize(L, L).composite([{ input: Buffer.from(`<svg width="${L}" height="${L}"><circle cx="${L/2}" cy="${L/2}" r="${L/2}"/></svg>`), blend: 'dest-in' }]).png().toFile(dir + 'ic_launcher_round.png')
    // adaptive icons show only the centre 72 of 108 dp, so the logo is drawn at 72 dp to stay whole
    const V = Math.round(72 * m), pad = Math.round((F - V) / 2)
    await sharp(master).resize(V, V).extend({ top: pad, bottom: F - V - pad, left: pad, right: F - V - pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(dir + 'ic_launcher_foreground.png')
    await sharp({ create: { width: F, height: F, channels: 4, background: BG } }).png().toFile(dir + 'ic_launcher_background.png')
  }
  // splash screens (Android + iOS): logo centred on the dark brand background
  const splashes = fs.readdirSync(res).filter(d => d.startsWith('drawable')).map(d => path.join(res, d, 'splash.png'))
  const ios = R + '/frontend/ios/App/App/Assets.xcassets/Splash.imageset'
  if (fs.existsSync(ios)) splashes.push(...fs.readdirSync(ios).filter(f => f.endsWith('.png')).map(f => path.join(ios, f)))
  for (const f of splashes.filter(fs.existsSync)) {
    const { width: w, height: h } = await sharp(f).metadata(), s = Math.round(Math.min(w, h) * 0.4)
    const logo = await sharp(master).resize(s, s).png().toBuffer()
    const buf = await sharp({ create: { width: w, height: h, channels: 4, background: BG } }).composite([{ input: logo, gravity: 'center' }]).png().toBuffer()
    fs.writeFileSync(f, buf)
  }
  // README / social banner
  const W = 1440, H = 480, ic = await sharp(master).resize(300, 300).png().toBuffer()
  const txt = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a3e635"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0e131a"/><stop offset="1" stop-color="#0a0d13"/></linearGradient></defs>
    <rect width="${W}" height="${H}" rx="36" fill="url(#bg)"/>
    <text x="500" y="250" font-family="Fira Sans, Segoe UI, Helvetica, Arial, sans-serif" font-weight="800" font-size="132" letter-spacing="6" fill="url(#g)">OPENFIT</text>
    <text x="506" y="320" font-family="Fira Sans, Segoe UI, Helvetica, Arial, sans-serif" font-weight="400" font-size="36" fill="#9aa4b2">Training · Body weight · Nutrition — self-hosted</text>
  </svg>`)
  await sharp(txt).composite([{ input: ic, left: 120, top: 90 }]).png().toFile(R + '/assets/banner.png')
})().catch(e => { console.error(e); process.exit(1) })

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const sharp = require(path.join(root, 'frontend/node_modules/sharp'))

// 1. Logo SVG (Square, 512x512)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e131a"/>
      <stop offset="50%" stop-color="#121822"/>
      <stop offset="100%" stop-color="#0a0d13"/>
    </linearGradient>

    <linearGradient id="vGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a3e635"/>
      <stop offset="50%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>

    <linearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>

    <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0"/>
      <stop offset="15%" stop-color="#22d3ee" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="85%" stop-color="#a3e635" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#a3e635" stop-opacity="0"/>
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="scanGlow" x="-30%" y="-100%" width="160%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="2" y="2" width="508" height="508" rx="110" fill="none" stroke="#2a3342" stroke-width="3" stroke-opacity="0.8"/>

  <!-- ==================== FOOD SCANNER VIEW FINDER CORNERS ==================== -->
  <g stroke="#38bdf8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.85">
    <!-- Top-Left -->
    <path d="M 64 120 L 64 76 A 12 12 0 0 1 76 64 L 120 64"/>
    <!-- Top-Right -->
    <path d="M 392 64 L 436 64 A 12 12 0 0 1 448 76 L 448 120"/>
    <!-- Bottom-Left -->
    <path d="M 64 392 L 64 436 A 12 12 0 0 0 76 448 L 120 448"/>
    <!-- Bottom-Right -->
    <path d="M 392 448 L 436 448 A 12 12 0 0 0 448 436 L 448 392"/>
  </g>

  <!-- ==================== VANTAGE FIT CHEVRON / "V" APEX ==================== -->
  <!-- Left Wing of V -->
  <path d="M 124 140 L 194 140 L 256 376 L 222 376 Z" fill="url(#vGrad)"/>
  <!-- Right Wing of V -->
  <path d="M 388 140 L 318 140 L 256 376 L 290 376 Z" fill="url(#vGrad)"/>
  <!-- Bottom Apex Joint -->
  <path d="M 222 376 L 256 424 L 290 376 Z" fill="#06b6d4"/>

  <!-- ==================== NUTRITION / APPLE LEAF TOP ==================== -->
  <path d="M 256 128 C 248 100 270 82 296 80 C 298 104 278 124 256 128 Z" fill="#a3e635"/>
  <path d="M 234 116 C 244 122 254 126 256 128" stroke="#a3e635" stroke-width="4" stroke-linecap="round" fill="none"/>

  <!-- ==================== FOOD SCANNER BARCODE STRIPES ==================== -->
  <g fill="#f8fafc" opacity="0.95">
    <rect x="194" y="200" width="5" height="88" rx="2.5"/>
    <rect x="206" y="200" width="10" height="88" rx="3"/>
    <rect x="222" y="200" width="4" height="88" rx="2"/>
    <rect x="232" y="200" width="12" height="88" rx="3"/>
    <rect x="250" y="200" width="6" height="88" rx="3"/>
    <rect x="262" y="200" width="10" height="88" rx="3"/>
    <rect x="278" y="200" width="5" height="88" rx="2.5"/>
    <rect x="289" y="200" width="12" height="88" rx="3"/>
    <rect x="307" y="200" width="6" height="88" rx="3"/>
    <rect x="319" y="200" width="4" height="88" rx="2"/>
  </g>

  <!-- ==================== OPENGYM DUMBBELL / BARBELL WEIGHTS ==================== -->
  <!-- Left Weight Plates -->
  <rect x="88" y="174" width="26" height="140" rx="9" fill="url(#plateGrad)"/>
  <rect x="120" y="192" width="18" height="104" rx="7" fill="#64748b"/>
  <!-- Right Weight Plates -->
  <rect x="398" y="174" width="26" height="140" rx="9" fill="url(#plateGrad)"/>
  <rect x="374" y="192" width="18" height="104" rx="7" fill="#64748b"/>

  <!-- Barbell Shaft Endcaps -->
  <rect x="74" y="234" width="22" height="20" rx="5" fill="#94a3b8"/>
  <rect x="416" y="234" width="22" height="20" rx="5" fill="#94a3b8"/>

  <!-- ==================== LASER SCANNER BEAM ==================== -->
  <!-- Laser Beam Outer Glow -->
  <rect x="70" y="240" width="372" height="8" rx="4" fill="url(#laserGrad)" filter="url(#scanGlow)"/>
  <!-- Laser Beam Core Line -->
  <line x1="84" y1="244" x2="428" y2="244" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Laser Scanning Point -->
  <circle cx="256" cy="244" r="5" fill="#ffffff" filter="url(#glow)"/>
  <circle cx="256" cy="244" r="8" fill="#a3e635" opacity="0.6"/>
</svg>`

// 2. Wide Banner SVG (720x240) for GitHub README & Documentation
const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="240" viewBox="0 0 720 240" role="img" aria-label="openfit — self-hosted gym, nutrition and food scanner tracker">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c1017"/>
      <stop offset="50%" stop-color="#111722"/>
      <stop offset="100%" stop-color="#080b0f"/>
    </linearGradient>

    <linearGradient id="vGradB" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a3e635"/>
      <stop offset="50%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>

    <linearGradient id="plateGradB" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>

    <linearGradient id="laserGradB" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0"/>
      <stop offset="20%" stop-color="#22d3ee" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="80%" stop-color="#a3e635" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#a3e635" stop-opacity="0"/>
    </linearGradient>

    <filter id="laserGlowB" x="-20%" y="-100%" width="140%" height="300%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Banner Background -->
  <rect width="720" height="240" rx="24" fill="url(#bannerBg)"/>
  <rect x="2" y="2" width="716" height="236" rx="22" fill="none" stroke="#252d3d" stroke-width="3"/>

  <!-- ==================== EMBLEM (Left: center around x=125, y=120, scale 0.38) ==================== -->
  <g transform="translate(30, 24) scale(0.375)">
    <!-- Viewfinder Brackets -->
    <g stroke="#38bdf8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9">
      <path d="M 64 120 L 64 76 A 12 12 0 0 1 76 64 L 120 64"/>
      <path d="M 392 64 L 436 64 A 12 12 0 0 1 448 76 L 448 120"/>
      <path d="M 64 392 L 64 436 A 12 12 0 0 0 76 448 L 120 448"/>
      <path d="M 392 448 L 436 448 A 12 12 0 0 0 448 436 L 448 392"/>
    </g>

    <!-- Vantage "V" Apex -->
    <path d="M 124 140 L 194 140 L 256 376 L 222 376 Z" fill="url(#vGradB)"/>
    <path d="M 388 140 L 318 140 L 256 376 L 290 376 Z" fill="url(#vGradB)"/>
    <path d="M 222 376 L 256 424 L 290 376 Z" fill="#06b6d4"/>

    <!-- Leaf / Apple Apex -->
    <path d="M 256 128 C 248 100 270 82 296 80 C 298 104 278 124 256 128 Z" fill="#a3e635"/>
    <path d="M 234 116 C 244 122 254 126 256 128" stroke="#a3e635" stroke-width="4" stroke-linecap="round" fill="none"/>

    <!-- Barcode Stripes -->
    <g fill="#f8fafc" opacity="0.95">
      <rect x="194" y="200" width="5" height="88" rx="2.5"/>
      <rect x="206" y="200" width="10" height="88" rx="3"/>
      <rect x="222" y="200" width="4" height="88" rx="2"/>
      <rect x="232" y="200" width="12" height="88" rx="3"/>
      <rect x="250" y="200" width="6" height="88" rx="3"/>
      <rect x="262" y="200" width="10" height="88" rx="3"/>
      <rect x="278" y="200" width="5" height="88" rx="2.5"/>
      <rect x="289" y="200" width="12" height="88" rx="3"/>
      <rect x="307" y="200" width="6" height="88" rx="3"/>
      <rect x="319" y="200" width="4" height="88" rx="2"/>
    </g>

    <!-- Dumbbell Plates -->
    <rect x="88" y="174" width="26" height="140" rx="9" fill="url(#plateGradB)"/>
    <rect x="120" y="192" width="18" height="104" rx="7" fill="#64748b"/>
    <rect x="398" y="174" width="26" height="140" rx="9" fill="url(#plateGradB)"/>
    <rect x="374" y="192" width="18" height="104" rx="7" fill="#64748b"/>
    <rect x="74" y="234" width="22" height="20" rx="5" fill="#94a3b8"/>
    <rect x="416" y="234" width="22" height="20" rx="5" fill="#94a3b8"/>

    <!-- Scanner Laser Beam -->
    <rect x="70" y="240" width="372" height="8" rx="4" fill="url(#laserGradB)" filter="url(#laserGlowB)"/>
    <line x1="84" y1="244" x2="428" y2="244" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="256" cy="244" r="6" fill="#ffffff"/>
    <circle cx="256" cy="244" r="9" fill="#a3e635" opacity="0.6"/>
  </g>

  <!-- ==================== TYPOGRAPHY & BRANDING (Right side) ==================== -->
  <!-- Wordmark -->
  <text x="246" y="92" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="64" font-weight="800" letter-spacing="-1.5">
    <tspan fill="#f8fafc">open</tspan><tspan fill="#a3e635">fit</tspan>
  </text>

  <!-- Pillar Line: Gym · Nutrition · Food Scanner -->
  <text x="248" y="128" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="2.5" fill="#38bdf8">
    GYM · NUTRITION · FOOD SCANNER
  </text>

  <!-- Tagline -->
  <text x="248" y="158" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="15" font-weight="500" fill="#94a3b8">
    Self-hosted training, barcode food tracking &amp; body weight you own.
  </text>

  <!-- Feature Badges Row -->
  <g transform="translate(248, 178)">
    <!-- Pill 1: Passkeys -->
    <rect x="0" y="0" width="112" height="26" rx="6" fill="#1e293b"/>
    <text x="56" y="17" font-family="-apple-system,Segoe UI,sans-serif" font-size="11.5" font-weight="600" fill="#cbd5e1" text-anchor="middle">🔑 Passkeys</text>

    <!-- Pill 2: Barcode Scanner -->
    <rect x="120" y="0" width="138" height="26" rx="6" fill="#1e293b"/>
    <text x="189" y="17" font-family="-apple-system,Segoe UI,sans-serif" font-size="11.5" font-weight="600" fill="#a3e635" text-anchor="middle">📷 Barcode Scan</text>

    <!-- Pill 3: Docker -->
    <rect x="266" y="0" width="86" height="26" rx="6" fill="#1e293b"/>
    <text x="309" y="17" font-family="-apple-system,Segoe UI,sans-serif" font-size="11.5" font-weight="600" fill="#38bdf8" text-anchor="middle">🐳 Docker</text>

    <!-- Pill 4: AGPL -->
    <rect x="360" y="0" width="82" height="26" rx="6" fill="#1e293b"/>
    <text x="401" y="17" font-family="-apple-system,Segoe UI,sans-serif" font-size="11.5" font-weight="600" fill="#f472b6" text-anchor="middle">AGPL-3.0</text>
  </g>
</svg>`

async function main() {
  console.log('Writing SVGs...')
  fs.writeFileSync(path.join(root, 'assets/logo.svg'), logoSvg)
  fs.writeFileSync(path.join(root, 'assets/banner.svg'), bannerSvg)
  fs.writeFileSync(path.join(root, 'frontend/public/favicon.svg'), logoSvg)

  console.log('Rendering high-res PNGs via sharp...')
  // 1. Banner PNG (720x240)
  await sharp(Buffer.from(bannerSvg))
    .png({ quality: 100 })
    .toFile(path.join(root, 'assets/banner.png'))
  console.log('Rendered assets/banner.png')

  // 2. Icon 512x512
  await sharp(Buffer.from(logoSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile(path.join(root, 'frontend/public/icon-512.png'))
  console.log('Rendered frontend/public/icon-512.png')

  // 3. Icon 180x180
  await sharp(Buffer.from(logoSvg))
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile(path.join(root, 'frontend/public/icon-180.png'))
  console.log('Rendered frontend/public/icon-180.png')

  console.log('All branding assets generated successfully!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

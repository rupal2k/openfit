// Exercise pictures come from jsDelivr (the app doesn't ship ~140 MB of them). The ones for
// exercises in your routines are saved in the Cache API whenever the app is online — about
// 100 KB per exercise — so the workouts you planned show their animations in airplane mode.
// Anything not saved still loads from the network as before.
import { useEffect, useState } from 'react'
import { imgSrc, gifSrc, EXIDX } from './exercises.js'

const CACHE = 'openfit-media-v1'
const hasCache = () => typeof caches !== 'undefined'
const open = () => caches.open(CACHE)

// Save the picture + animation of these exercise ids that aren't saved yet. Returns how many
// files were added. Failures are fine: it's tried again next time.
export async function saveMedia(ids, fetchFn = fetch) {
  if (!hasCache()) return 0
  const cache = await open()
  const urls = [...new Set(ids)].map(id => EXIDX[id]).filter(e => e && e.img && e.gif && !e.missing)
    .flatMap(e => [imgSrc(e), gifSrc(e)]).filter(u => /^https:\/\//.test(u))
  let added = 0
  for (const u of urls) {
    if (await cache.match(u)) continue
    try {
      const res = await fetchFn(u, { mode: 'cors' })
      if (res.ok) { await cache.put(u, res); added++ }
    } catch { /* offline or blocked: next time */ }
  }
  return added
}

// The exercise ids of every routine.
export const routineExIds = S => (S.routines || []).flatMap(r => (r.ex || []).map(e => e.id))

// src for an <img>: the saved copy when there is one, otherwise the URL itself. '' while the
// cache is being asked, so the <img> never tries the network first and fails offline.
const cacheable = url => hasCache() && /^https:\/\//.test(url || '')
export function useMediaSrc(url) {
  const [src, setSrc] = useState(cacheable(url) ? '' : url)
  useEffect(() => {
    if (!cacheable(url)) { setSrc(url); return }
    setSrc('')
    let obj = null, live = true
    open().then(c => c.match(url)).then(r => r && r.blob()).then(b => {
      if (!live) return
      if (b) { obj = URL.createObjectURL(b); setSrc(obj) } else setSrc(url)
    }).catch(() => { if (live) setSrc(url) })
    return () => { live = false; if (obj) URL.revokeObjectURL(obj) }
  }, [url])
  return src
}

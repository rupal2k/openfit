// Opt-in update check for the sideloaded APK: there is no store to tell people a fix exists.
// Asks GitHub for the latest release tag (no data about the person is sent) and compares it
// with this build's version. Off unless the person turns it on, or taps "Check for updates".
export const RELEASES_API = 'https://api.github.com/repos/rupal2k/openfit/releases/latest'
const parse = v => String(v || '').replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0)

// is version a newer than b? (1.6.10 > 1.6.9; a pre-release suffix is ignored)
export function isNewer(a, b) {
  const x = parse(a), y = parse(b)
  for (let i = 0; i < Math.max(x.length, y.length, 3); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0)
  }
  return false
}

export async function checkForUpdate(current, fetchFn = fetch) {
  const r = await fetchFn(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const j = await r.json()
  const latest = String(j.tag_name || '').replace(/^v/i, '')
  if (!/^\d+\.\d+/.test(latest)) throw new Error('no version')
  // only ever link to this project's own release page
  const url = typeof j.html_url === 'string' && j.html_url.startsWith('https://github.com/rupal2k/openfit/') ? j.html_url : 'https://github.com/rupal2k/openfit/releases/latest'
  return { latest, url, newer: isNewer(latest, current) }
}

// at most one automatic check a day
export const DAY_MS = 24 * 3600 * 1000
export const dueForCheck = (lastTs, now = Date.now()) => !lastTs || now - lastTs >= DAY_MS

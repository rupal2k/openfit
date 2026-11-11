// Mobile build (VITE_MOBILE=1) — the standalone app-store version (Capacitor native shell).
//
// There is no backend: nothing to sign in to, everything lives on the phone. Unlike guest
// mode in a browser, this is the user's only copy of their training log, so it can't depend
// on WebView localStorage alone (iOS evicts that under storage pressure). Every persist()
// therefore also lands in a JSON file in the app's private data directory, and boot()
// restores from it. The workout reminder uses native local notifications scheduled per
// planned weekday — no server involved, unlike Web Push in the self-hosted version.
//
// Like the demo build, MOBILE is replaced at build time, so all of this folds away in
// web bundles; the Capacitor plugins are only ever imported behind it.
import { t } from './i18n.js'

export const MOBILE = import.meta.env.VITE_MOBILE === '1'

const FILE = 'openfit-state.json'
const LEGACY_FILE = 'opengym-state.json'

export async function nativeLoad() {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    try {
      const r = await Filesystem.readFile({ path: FILE, directory: Directory.Data, encoding: Encoding.UTF8 })
      return JSON.parse(r.data)
    } catch {
      const r = await Filesystem.readFile({ path: LEGACY_FILE, directory: Directory.Data, encoding: Encoding.UTF8 })
      return JSON.parse(r.data)
    }
  } catch (e) { return null }   // first launch, or unreadable — localStorage copy takes over
}

export async function nativeSave(state) {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({ path: FILE, directory: Directory.Data, data: JSON.stringify(state), encoding: Encoding.UTF8 })
  } catch (e) { /* keep the localStorage copy */ }
}

// (Re)schedule the workout-day reminder: one repeating notification per weekday that has a
// routine in the weekly plan. Cheap enough to run after any state change — the plan or the
// reminder time may just have been edited. `interactive` gates the OS permission prompt to
// the Settings toggle; a background resync never pops a dialog.
// Is OPENFIT allowed to show notifications? (revoked in Android settings = reminders never arrive)
export async function notificationsAllowed() {
  if (!MOBILE) return true
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    return (await LocalNotifications.checkPermissions()).display === 'granted'
  } catch { return true }
}
export async function syncReminder(S, interactive = false) {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [0, 1, 2, 3, 4, 5, 6].map(d => ({ id: 100 + d })) }).catch(() => {})
    const r = S.reminder
    if (!r?.on) return true
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted' && interactive) perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return false
    const [hour, minute] = (r.time || '08:00').split(':').map(Number)
    const notifications = Object.entries(S.week || {})
      .filter(([, rid]) => rid && (S.routines || []).some(x => x.id === rid))
      .map(([day, rid]) => ({
        id: 100 + Number(day),
        title: t('Workout day'),
        body: t('{0} is on the plan today — let’s go!', S.routines.find(x => x.id === rid).name),
        // Capacitor weekdays are 1 (Sunday) … 7 (Saturday); S.week uses getDay() 0…6.
        schedule: { on: { weekday: Number(day) + 1, hour, minute }, allowWhileIdle: true },
      }))
    if (notifications.length) await LocalNotifications.schedule({ notifications })
    return true
  } catch (e) { return false }
}

// WKWebView can't do blob-URL downloads, so the backup goes out through the OS share sheet
// (Files, AirDrop, mail, …) from a temp file instead.
// Imported text files above this are refused before they are read: a plan or a backup is a
// few hundred KB, and reading a huge file can take the WebView down.
// Android app: keep a screen out of screenshots and the recent-apps preview while it shows
// health results (native PrivacyScreen plugin, MainActivity). A no-op on the web.
export function privacyScreen(on) {
  if (!MOBILE) return
  import('@capacitor/core').then(({ registerPlugin }) => registerPlugin('PrivacyScreen').set({ on })).catch(() => {})
}

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024
export const tooBig = f => !!f && f.size > MAX_IMPORT_BYTES

// Android WebView + system photo picker: a picked File reads once as a whole, then every later
// read (blob: URL, <img>, createImageBitmap, FileReader, slice) fails with NotReadableError /
// ERR_UPLOAD_FILE_CHANGED. Copy it into memory on the first read; work only on the copy.
// Check the size before calling this.
export async function readOnce(f) {
  return new File([await f.arrayBuffer()], f.name, { type: f.type, lastModified: f.lastModified })
}

// The backup goes to the share sheet from a cache file. The receiving app may read it after
// Share resolves, so it can't be deleted then; the previous export is removed instead, so at
// most one copy of the health data sits in the cache.
let lastExport = null
// Reset everything: no backup or plan file with health data may stay in the app cache.
// The camera hands its photo back as a full-size JPEG in the app's external files dir
// (Capacitor's file chooser, getExternalFilesDir(Pictures)); nothing removed it, and on older
// Android, USB or adb it can be read there: a lab report photo carries name, birth date and
// results. Delete every capture once its bytes are in memory, on boot (cancelled or killed
// captures) and on Reset.
export async function clearCaptures() {
  if (!MOBILE) return
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { files } = await Filesystem.readdir({ path: 'Pictures', directory: Directory.External })
    for (const f of files) if (/^JPEG_.*\.jpg$/i.test(f.name)) await Filesystem.deleteFile({ path: 'Pictures/' + f.name, directory: Directory.External }).catch(() => {})
  } catch { /* no captures yet */ }
  // picked files are copied into cache/picks by the native chooser (PickCopyChromeClient)
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { files } = await Filesystem.readdir({ path: 'picks', directory: Directory.Cache })
    for (const f of files) await Filesystem.deleteFile({ path: 'picks/' + f.name, directory: Directory.Cache }).catch(() => {})
  } catch { /* no picks yet */ }
}
export async function clearExports() {
  if (!MOBILE) return
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { files } = await Filesystem.readdir({ path: '', directory: Directory.Cache })
    for (const f of files) if (/^openfit-(backup|plan)-.*\.json$/.test(f.name)) await Filesystem.deleteFile({ path: f.name, directory: Directory.Cache }).catch(() => {})
  } catch { /* nothing cached */ }
  lastExport = null
  await clearCaptures()
}
export async function shareExport(json, filename) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  if (lastExport && lastExport !== filename) await Filesystem.deleteFile({ path: lastExport, directory: Directory.Cache }).catch(() => {})
  const w = await Filesystem.writeFile({ path: filename, directory: Directory.Cache, data: json, encoding: Encoding.UTF8 })
  lastExport = filename
  await Share.share({ title: filename, url: w.uri })
}

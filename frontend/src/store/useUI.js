import { create } from 'zustand'
import { uid } from '../lib/format.js'
import { beep, vibrate } from '../lib/sound.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { useStore } from './useStore.js'

// Fire-and-forget: lets the server push a "rest over" alert if this tab gets suspended
// before the local timer completes. No-ops for guests / offline.
const pushRestTimer = sec => { if (useStore.getState().user) api('/api/push/rest-timer', { method: 'POST', body: JSON.stringify({ seconds: sec }) }).catch(() => {}) }
const cancelPushRestTimer = () => { if (useStore.getState().user) api('/api/push/rest-timer/cancel', { method: 'POST', body: '{}' }).catch(() => {}) }

let toastTm = null
let timerInt = null
let timerTick = null
let workInt = null
let workTick = null
let workDone = null
let restNext = null   // what starts when a rest runs out or is skipped (the next timed set of a circuit)

let poppingDueToClose = false
// what to run once the history.back() of a sheet close has landed (see afterClose)
let afterPop = null

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (poppingDueToClose) {
      poppingDueToClose = false
      const fn = afterPop; afterPop = null
      if (fn) fn()
      return
    }
    const sheets = useUI.getState().sheets
    if (!sheets.length) return
    const top = sheets[sheets.length - 1]
    if (top && !top.locked) {
      useUI.setState(s => ({ sheets: s.sheets.slice(0, -1) }))
    }
  })
}

export const useUI = create((set, get) => ({
  sheets: [],          // { id, render:(close)=>JSX, kind:'sheet'|'center', locked }
  toastMsg: '',
  toastUndo: null,
  timer: null,         // rest countdown between sets — { left, total, endsAt }
  work: null,          // work countdown DURING a timed set (issue #16) — { left, total, endsAt, label }

  openSheet(render, { kind = 'sheet', locked = false } = {}) {
    // Clear any lingering toast so it doesn't overlap sheet controls (Audit M6)
    clearTimeout(toastTm)
    set({ toastMsg: '', toastUndo: null })

    const id = uid()
    set(s => ({ sheets: [...s.sheets, { id, render, kind, locked, pushedHistory: false }] }))
    const push = () => {
      if (!get().sheets.some(x => x.id === id) || typeof window === 'undefined' || !window.history) return
      try { window.history.pushState({ openfitSheet: id }, '', window.location.href) } catch { return }
      set(s => ({ sheets: s.sheets.map(x => x.id === id ? { ...x, pushedHistory: true } : x) }))
    }
    // A sheet closed just before this one (photo -> review) is still popping its entry. Pushing
    // now would let that back() eat this sheet's entry, and the next Back would leave the page.
    get().afterClose(push)
    const close = () => get().closeSheet(id)
    return { id, close, lock: v => set(s => ({ sheets: s.sheets.map(x => x.id === id ? { ...x, locked: v } : x) })) }
  },
  // Run fn after a sheet that was just closed has finished popping its history entry. Closing
  // calls history.back(), which lands later: a nav() made right after close() was undone by it.
  afterClose(fn) {
    if (!poppingDueToClose) return fn()
    const prev = afterPop
    afterPop = prev ? () => { prev(); fn() } : fn
  },
  closeSheet(id) {
    const list = get().sheets
    const sheet = list.find(x => x.id === id)
    if (sheet && sheet.pushedHistory && typeof window !== 'undefined' && window.history?.state?.openfitSheet === id) {
      poppingDueToClose = true
      window.history.back()
    }
    set(s => ({ sheets: s.sheets.filter(x => x.id !== id) }))
  },
  closeAll() {
    const list = get().sheets
    list.forEach(s => {
      if (s.pushedHistory && typeof window !== 'undefined' && window.history?.state?.openfitSheet === s.id) {
        poppingDueToClose = true
        window.history.back()
      }
    })
    set({ sheets: [] })
  },

  toast(msg, opts = {}) {
    const undo = typeof opts === 'function' ? opts : opts.undo || null
    const duration = opts.duration || (undo ? 4500 : 2200)
    set({ toastMsg: msg, toastUndo: undo })
    clearTimeout(toastTm)
    toastTm = setTimeout(() => set({ toastMsg: '', toastUndo: null }), duration)
  },

  startRest(sec, onEnd) {
    get().stopRest()
    restNext = onEnd || null
    const endsAt = Date.now() + sec * 1000
    set({ timer: { left: sec, total: sec, endsAt } })
    pushRestTimer(sec)
    timerTick = () => {
      const tm = get().timer
      if (!tm) return
      const left = Math.max(0, Math.round((tm.endsAt - Date.now()) / 1000))
      if (left === tm.left) return
      const snd = useStore.getState().S.sound
      if (left <= 0) {
        beep(snd, 880, 0.15); beep(snd, 880, 0.15, 0.25); beep(snd, 1320, 0.4, 0.5)
        vibrate([200, 100, 200]); get().toast(t('Rest over — next set!'))
        // ran out while the app was in the background: don't drop you into a hold unannounced
        if (Date.now() - tm.endsAt > 2000) get().stopRest(); else get().skipRest()
        return
      }
      if (left <= 3) beep(snd, 660, 0.1)
      set({ timer: { ...tm, left } })
    }
    timerInt = setInterval(timerTick, 1000)
    document.addEventListener('visibilitychange', timerTick)
  },
  addRest(sec) {
    const tm = get().timer
    if (!tm) return
    const left = tm.left + sec
    // taking off more than is left means "I'm ready now" — same as skipping, and it keeps a
    // negative duration out of both the progress bar and the server-side push schedule
    if (left <= 0) { get().skipRest(); return }
    set({ timer: { ...tm, left, total: tm.total + sec, endsAt: tm.endsAt + sec * 1000 } })
    pushRestTimer(left)
  },
  // The running rest should lead into the next timed set when it ends.
  onRestEnd(fn) { if (get().timer) restNext = fn },
  // Rest is over (ran out, or "I'm ready now"): stop it and start whatever was queued.
  skipRest() {
    const next = restNext
    get().stopRest()
    if (next) next()
  },
  stopRest() {
    restNext = null
    if (timerInt) clearInterval(timerInt); timerInt = null
    if (timerTick) document.removeEventListener('visibilitychange', timerTick); timerTick = null
    if (get().timer) cancelPushRestTimer()
    set({ timer: null })
  },

  /* ---- work timer (issue #16) ----
     Times the set itself, not the recovery after it. Kept separate from the rest timer on
     purpose: the two mean opposite things, they must never run together, and a work set is
     something you are watching — so it gets no server push (that endpoint says "rest over",
     and a plank does not need a notification you are staring at anyway).
     `onDone(elapsedSec)` is called both when the countdown reaches zero and on an early
     finish; the elapsed time is what actually gets logged, so stopping at 0:38 of a 0:45
     hold records 0:38 rather than crediting the full target. */
  startWork(sec, label, onDone) {
    get().stopWork()
    get().stopRest()
    const total = Math.max(1, Math.round(sec) || 1)
    const endsAt = Date.now() + total * 1000
    workDone = onDone
    set({ work: { left: total, total, endsAt, label } })
    workTick = () => {
      const wk = get().work
      if (!wk) return
      const left = Math.max(0, Math.round((wk.endsAt - Date.now()) / 1000))
      if (left === wk.left) return
      const snd = useStore.getState().S.sound
      if (left <= 0) {
        beep(snd, 880, 0.15); beep(snd, 880, 0.15, 0.25); beep(snd, 1320, 0.4, 0.5)
        vibrate([200, 100, 200])
        const done = workDone
        get().stopWork()
        if (done) done(wk.total, Date.now() - wk.endsAt > 2000)
        return
      }
      if (left <= 3) beep(snd, 660, 0.1)
      set({ work: { ...wk, left } })
    }
    workInt = setInterval(workTick, 1000)
    document.addEventListener('visibilitychange', workTick)
  },
  // Ended the hold early — log what was actually held.
  finishWorkEarly() {
    const wk = get().work
    if (!wk) return
    const elapsed = Math.max(1, wk.total - wk.left)
    const done = workDone
    vibrate(30)
    get().stopWork()
    if (done) done(elapsed)
  },
  // Abandon without logging anything.
  stopWork() {
    if (workInt) clearInterval(workInt); workInt = null
    if (workTick) document.removeEventListener('visibilitychange', workTick); workTick = null
    workDone = null
    set({ work: null })
  }
}))

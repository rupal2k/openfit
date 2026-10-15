// Nutrition sheets: targets set-up, food search, amount, custom food, barcode scan.
// Kept apart from sheets.jsx (workouts/plan), which is already 1,200 lines.
import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { t } from './lib/i18n.js'
import { fmtNum, uid } from './lib/format.js'
import { targets, bodyKg, entryTotals, addEntry, updateEntry, removeEntry, recentFoods, MEALS, UNITS, toGrams, fromGrams } from './lib/nutrition.js'
import { searchFoods, lookupBarcode, SEARCH_OK } from './lib/food.js'
import { bwSheet } from './sheets.jsx'
import { MOBILE } from './lib/mobile.js'
import Icon from './components/Icon.jsx'
import { Button, Segmented, SelectRow, NumberField, Row, Stepper, SearchField, TextField, Slider } from './components/ui.jsx'

const update = (...a) => useStore.getState().update(...a)
const ui = () => useUI.getState()
const toast = m => ui().toast(m)
export const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks' }

/* ============================ profile / targets ============================ */
const DEF_PROFILE = { sex: 'male', birthYear: null, heightCm: null, pal: 'low', goal: 'maintain', kcal: null }

export const nutritionProfileSheet = () => ui().openSheet(close => <NutritionProfile close={close} />)

function NutritionProfile({ close }) {
  const S = useStore(s => s.S)
  const [p, setP] = useState({ ...DEF_PROFILE, ...(S.nutrition.profile || {}) })
  const set = k => v => setP(o => ({ ...o, [k]: v }))
  const preview = targets({ ...S, nutrition: { ...S.nutrition, profile: p } })
  const w = bodyKg(S)
  const curYear = new Date().getFullYear()
  const validBirth = !p.birthYear || (p.birthYear >= 1900 && p.birthYear <= curYear - 10)
  const validHeight = !p.heightCm || (p.heightCm >= 50 && p.heightCm <= 280)
  const validKcal = !p.kcal || (p.kcal >= 500 && p.kcal <= 10000)
  const valid = validBirth && validHeight && validKcal

  const save = () => {
    if (!valid) return
    if (!preview) {
      toast(t('Add birth year, height and a weigh-in — or set a calorie override.'))
      return
    }
    update(s => { s.nutrition.profile = p })
    close()
    toast(t('Targets saved'))
  }
  return <>
    <h3>{t('Your targets')}</h3>
    <Row title={t('Sex')}><Segmented className="seg-inline" value={p.sex} onChange={set('sex')}
      options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }, { value: 'other', label: t('Other') }]} /></Row>
    <Row title={t('Birth year')}><NumberField decimal={false} nullable value={p.birthYear} onChange={set('birthYear')} placeholder="1990" aria-label={t('Birth year')} /></Row>
    {!validBirth && <div className="small" style={{ color: 'var(--red)', marginTop: -6, marginBottom: 6 }}>{t('Enter a 4-digit birth year between 1900 and {0}', curYear - 10)}</div>}
    <Row title={t('Height (cm)')}><NumberField decimal={false} nullable value={p.heightCm} onChange={set('heightCm')} placeholder="175" aria-label={t('Height (cm)')} /></Row>
    {!validHeight && <div className="small" style={{ color: 'var(--red)', marginTop: -6, marginBottom: 6 }}>{t('Height must be between 50 and 280 cm')}</div>}
    <Row title={t('Body weight')} value={w ? fmtNum(w) + ' kg' : t('Not logged')} accessory="chevron" onClick={() => bwSheet()} />
    <SelectRow title={t('Activity')} value={p.pal} onChange={set('pal')} options={[
      { value: 'sedentary', label: t('Sedentary'), subtitle: t('Desk job, little walking') },
      { value: 'low', label: t('Lightly active'), subtitle: t('Some walking, training 1–3× a week') },
      { value: 'active', label: t('Active'), subtitle: t('On your feet a lot, training 3–5× a week') },
      { value: 'very', label: t('Very active'), subtitle: t('Physical job or training daily') }]} />
    <Row title={t('Goal')}><Segmented className="seg-inline" value={p.goal} onChange={set('goal')}
      options={[{ value: 'lose', label: t('Lose') }, { value: 'maintain', label: t('Maintain') }, { value: 'gain', label: t('Gain') }]} /></Row>
    <Row title={t('Calorie override')} subtitle={t('Leave empty to calculate')}>
      <NumberField decimal={false} nullable value={p.kcal} onChange={set('kcal')} placeholder="—" aria-label={t('Calorie override')} /></Row>
    {!validKcal && <div className="small" style={{ color: 'var(--red)', marginTop: -6, marginBottom: 6 }}>{t('Calories must be between 500 and 10,000 kcal')}</div>}
    <div className="card" style={{ margin: '12px 0' }}>
      {preview
        ? <div className="row between"><b className="accent">{preview.kcal} kcal</b>
            <span className="small muted">{t('P {0} g · C {1} g · F {2} g', preview.protein, preview.carbs, preview.fat)}</span></div>
        : <div className="small muted">{t('Add birth year, height and a weigh-in — or set a calorie override.')}</div>}
    </div>
    <Button variant="primary" disabled={!valid || !preview} onClick={save}>{t('Save')}</Button>
    <div className="small dim" style={{ marginTop: 8 }}>{t('Estimate from the IOM 2005 equations, as used by OpenNutriTracker. Protein: 1.6 g per kg body weight.')}</div>
  </>
}

/* ============================ amount (add / edit) ============================ */
export const foodAmountSheet = (iso, meal, food, entry) =>
  ui().openSheet(close => <FoodAmount iso={iso} meal={meal} food={food} entry={entry} close={close} />)

function FoodAmount({ iso, meal: meal0, food, entry, close }) {
  const hasServing = Boolean(food.serving && food.serving > 0)
  const sUnit = food.servingUnit || 'g'
  const defUnit = entry
    ? (entry.u || (hasServing && entry.g === food.serving ? 'serving' : 'g'))
    : (hasServing ? 'serving' : 'g')

  const [u, setU] = useState(defUnit)
  const [qty, setQty] = useState(() => {
    if (entry) return fromGrams(entry.g, defUnit, food.serving)
    if (hasServing && defUnit === 'serving') return 1
    return fromGrams(food.serving || 100, defUnit, food.serving)
  })
  const g = toGrams(qty, u, food.serving)

  const pickUnit = nu => {
    const curG = toGrams(qty, u, food.serving)
    setQty(fromGrams(curG, nu, food.serving))
    setU(nu)
  }

  const [meal, setMeal] = useState(entry ? entry.meal : meal0)
  const tot = entryTotals({ g: g || 0, food })

  const save = () => {
    if (!(g > 0)) return toast(t('Enter an amount'))
    update(s => entry ? updateEntry(s, iso, entry.id, { g, u: u === 'g' ? undefined : u, meal }) : addEntry(s, iso, { meal, g, u, food }))
    close()
    toast(entry ? t('Entry updated') : t('Added to {0}', t(MEAL_LABEL[meal])))
  }

  const unitOptions = hasServing ? [
    { value: 'serving', label: t('Serving ({0}{1})', food.serving, sUnit) },
    { value: sUnit, label: sUnit },
    { value: sUnit === 'ml' ? 'g' : 'oz', label: sUnit === 'ml' ? 'g' : 'oz' }
  ] : [
    { value: 'g', label: 'g' },
    { value: 'ml', label: 'ml' },
    { value: 'oz', label: 'oz' },
    { value: 'kg', label: 'kg' }
  ]

  const isServing = u === 'serving'
  const step = isServing ? 0.5 : (UNITS[u]?.step || 10)
  const dec = isServing ? true : Boolean(UNITS[u]?.dec)
  const stepperUnit = isServing ? (qty === 1 ? t('serving') : t('servings')) : u

  return <>
    <h3>{food.name}</h3>
    {(food.brand || food.servingSize) && (
      <div className="small muted" style={{ marginTop: -6, marginBottom: 10 }}>
        {[food.brand, food.servingSize].filter(Boolean).join(' · ')}
      </div>
    )}
    <Stepper label={t('Amount')} unit={stepperUnit} value={qty} step={step} decimal={dec} onChange={setQty} />
    {isServing && (
      <div className="small muted" style={{ textAlign: 'center', marginTop: 4, marginBottom: 4 }}>
        {t('{0} {1} = {2} {3}', qty, qty === 1 ? t('serving') : t('servings'), g, sUnit)}
      </div>
    )}
    <div style={{ margin: '8px 0' }}><Segmented value={u} onChange={pickUnit} options={unitOptions} /></div>
    {hasServing && (u !== 'serving' || qty !== 1) && (
      <Button size="sm" variant="ghost" onClick={() => { setU('serving'); setQty(1) }}>
        {t('1 serving ({0} {1})', food.serving, sUnit)}
      </Button>
    )}
    <div style={{ margin: '12px 0' }}><Segmented value={meal} onChange={setMeal} options={MEALS.map(m => ({ value: m, label: t(MEAL_LABEL[m]) }))} /></div>
    <div className="card row between" style={{ marginBottom: 12 }}>
      <b className="accent">{fmtNum(tot.kcal)} kcal</b>
      <span className="small muted">{t('P {0} g · C {1} g · F {2} g', fmtNum(tot.p), fmtNum(tot.c), fmtNum(tot.f))}</span>
    </div>
    <Button variant="primary" onClick={save}>{entry ? t('Save') : t('Add')}</Button>
    {entry && <><div style={{ height: 8 }} />
      <Button variant="danger" icon="trash" onClick={() => {
        const backupEntry = { ...entry }
        update(s => removeEntry(s, iso, entry.id))
        close()
        toast(t('Entry removed'), {
          undo: () => update(s => addEntry(s, iso, backupEntry))
        })
      }}>{t('Remove')}</Button></>}
  </>
}

/* ============================ custom food ============================ */
export const customFoodSheet = onDone => ui().openSheet(close => <CustomFood onDone={onDone} close={close} />)

function CustomFood({ onDone, close }) {
  const [name, setName] = useState('')
  const [serving, setServing] = useState(null)
  const [n, setN] = useState({ kcal: null, p: null, c: null, f: null })
  const setK = k => v => setN(o => ({ ...o, [k]: v }))
  const save = () => {
    if (!name.trim() || n.kcal === null) return toast(t('Name and calories are required'))
    const food = {
      src: 'custom', id: uid(), code: '', name: name.trim(), brand: '',
      serving: serving ? +serving : null,
      servingUnit: 'g',
      servingSize: serving ? `${serving} g` : null,
      per100: { kcal: n.kcal, p: n.p ?? 0, c: n.c ?? 0, f: n.f ?? 0 }
    }
    update(s => {
      s.nutrition ||= { profile: null, days: {}, foods: [] }
      ;(s.nutrition.foods ||= []).push(food)
    })
    close(); onDone && onDone(food)
    toast(t('Food added'))
  }
  return <>
    <h3>{t('New food')}</h3>
    <TextField placeholder={t('Name')} value={name} onChange={e => setName(e.target.value)} autoFocus aria-label={t('Name')} />
    <Row title={t('Serving size (g)')} subtitle={t('Optional')}>
      <NumberField nullable decimal={false} value={serving} onChange={setServing} placeholder="100" aria-label={t('Serving size (g)')} />
    </Row>
    <h4 className="sec">{t('Per 100 g')}</h4>
    <Row title={t('Calories (kcal)')}><NumberField nullable value={n.kcal} onChange={setK('kcal')} placeholder="0" aria-label={t('Calories (kcal)')} /></Row>
    <Row title={t('Protein (g)')}><NumberField nullable value={n.p} onChange={setK('p')} placeholder="0" aria-label={t('Protein (g)')} /></Row>
    <Row title={t('Carbs (g)')}><NumberField nullable value={n.c} onChange={setK('c')} placeholder="0" aria-label={t('Carbs (g)')} /></Row>
    <Row title={t('Fat (g)')}><NumberField nullable value={n.f} onChange={setK('f')} placeholder="0" aria-label={t('Fat (g)')} /></Row>
    <div style={{ height: 10 }} />
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
  </>
}

/* ============================ search ============================ */
export const foodSearchSheet = (iso, meal) => ui().openSheet(close => <FoodSearch iso={iso} meal={meal} close={close} />)

function FoodSearch({ iso, meal, close }) {
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const canSearch = SEARCH_OK && (!!user || MOBILE)
  const [q, setQ] = useState('')
  const [res, setRes] = useState({ q: '', foods: [], busy: false, err: null })
  const seq = useRef(0)
  useEffect(() => {
    const term = q.trim()
    if (!canSearch || term.length < 2) { setRes({ q: '', foods: [], busy: false, err: null }); return }
    const my = ++seq.current
    setRes(r => ({ ...r, busy: true, err: null }))
    const tm = setTimeout(() => searchFoods(term)
      .then(foods => { if (my === seq.current) setRes({ q: term, foods, busy: false, err: null }) })
      .catch(e => { if (my === seq.current) setRes({ q: term, foods: [], busy: false, err: e.message }) }), 400)
    return () => clearTimeout(tm)
  }, [q, canSearch])

  const pick = food => { close(); foodAmountSheet(iso, meal, food) }
  const term = q.trim().toLowerCase()
  const foodsList = S.nutrition?.foods || []
  const mine = foodsList.filter(f => !term || f.name.toLowerCase().includes(term))
  const recent = term ? [] : recentFoods(S, 15)
  const row = (f, i) => <Row key={(f.code || f.id || f.name) + i} title={f.name}
    subtitle={[f.brand, t('{0} kcal / 100 g', fmtNum(f.per100.kcal))].filter(Boolean).join(' · ')}
    accessory="chevron" onClick={() => pick(f)} />

  return <>
    <h3>{t('Add to {0}', t(MEAL_LABEL[meal]))}</h3>
    {!SEARCH_OK ? (
      <div className="small muted">{t('Food search needs a self-hosted server. Scan a barcode or add your own food.')}</div>
    ) : !user && !MOBILE ? (
      <div className="small muted">{t('Sign in to search Open Food Facts. You can scan a barcode or add your own food.')}</div>
    ) : (
      <SearchField placeholder={t('Search foods')} value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} autoFocus />
    )}
    <div className="row" style={{ gap: 8, margin: '10px 0' }}>
      <Button size="sm" variant="tinted" icon="barcode" onClick={() => { close(); barcodeSheet(iso, meal) }}>{t('Scan barcode')}</Button>
      {/* dynamic: vision-sheets.jsx imports from this file */}
      <Button size="sm" variant="tinted" icon="camera" onClick={() => { close(); import('./vision-sheets.jsx').then(m => m.photoSheet(iso, meal)) }}>{t('Photo')}</Button>
      <Button size="sm" variant="tinted" icon="plus" onClick={() => { close(); customFoodSheet(f => foodAmountSheet(iso, meal, f)) }}>{t('New food')}</Button>
    </div>
    {res.busy && <div className="small muted">{t('Searching…')}</div>}
    {res.err && <div className="small" style={{ color: 'var(--red)' }}>{t('Search failed: {0}', res.err)}</div>}
    {!!mine.length && <><h4 className="sec">{t('My foods')}</h4><div className="sect-b">{mine.map(row)}</div></>}
    {!!recent.length && <><h4 className="sec">{t('Recent')}</h4><div className="sect-b">{recent.map(row)}</div></>}
    {!!res.foods.length && <><h4 className="sec">{t('Open Food Facts')}</h4><div className="sect-b">{res.foods.map(row)}</div></>}
    {!res.busy && res.q && !res.foods.length && !res.err && <div className="small muted">{t('No results for “{0}”.', res.q)}</div>}
  </>
}

/* ============================ barcode ============================ */
export const barcodeSheet = (iso, meal) => ui().openSheet(close => <Barcode iso={iso} meal={meal} close={close} />)

function Barcode({ iso, meal, close }) {
  const video = useRef(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const busy = useRef(false)
  // camera controls the device actually offers (Chrome / Android WebView expose these; others hide them)
  const track = useRef(null)
  const [caps, setCaps] = useState({})
  const [zoom, setZoom] = useState(1)
  const [torch, setTorch] = useState(false)
  const [ring, setRing] = useState(null)
  const apply = c => track.current?.applyConstraints({ advanced: [c] }).catch(() => {})
  const setZ = z => { setZoom(z); apply({ zoom: z }) }
  const flip = () => { apply({ torch: !torch }); setTorch(!torch) }
  const tapFocus = e => {
    if (!caps.focusMode) return
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    setRing({ x, y })
    const back = () => setTimeout(() => { setRing(null); caps.focusMode.includes('continuous') && apply({ focusMode: 'continuous' }) }, 1200)
    const mode = caps.focusMode.includes('single-shot') ? 'single-shot' : caps.focusMode[0]
    track.current.applyConstraints({ advanced: [{ focusMode: mode, pointsOfInterest: [{ x, y }] }] })
      .catch(() => apply({ focusMode: mode })).finally(back)
  }

  const find = async c => {
    if (busy.current) return
    busy.current = true; setMsg(t('Looking up {0}…', c))
    try {
      const food = await lookupBarcode(c)
      if (food) { close(); foodAmountSheet(iso, meal, food); return }
      setMsg(t('{0} isn’t in Open Food Facts. Add it as your own food instead.', c))
    } catch { setMsg(t('Lookup failed — check your connection.')) }
    busy.current = false
  }

  useEffect(() => {
    if (!('BarcodeDetector' in window)) return
    let stream, raf, stop = false
    const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
    // HD + continuous focus: at the default 640×480 a small EAN is a few pixels per bar and never decodes
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 }, advanced: [{ focusMode: 'continuous' }] } }).then(s => {
      if (stop) { s.getTracks().forEach(tr => tr.stop()); return }
      stream = s; video.current.srcObject = s; video.current.play()
      track.current = s.getVideoTracks()[0]
      const c = track.current.getCapabilities?.() || {}
      setCaps(c); if (c.zoom) setZoom(track.current.getSettings().zoom || c.zoom.min)
      const tick = async () => {
        if (stop) return
        try { const [hit] = await det.detect(video.current); if (hit) find(hit.rawValue) } catch { /* frame not ready */ }
        raf = setTimeout(tick, 250)
      }
      tick()
    }).catch(() => setMsg(t('Camera unavailable — type the code instead.')))
    return () => { stop = true; clearTimeout(raf); stream && stream.getTracks().forEach(tr => tr.stop()) }
  }, [])

  return <>
    <h3>{t('Scan barcode')}</h3>
    {'BarcodeDetector' in window
      ? <>
        <div onClick={tapFocus} style={{ position: 'relative' }}>
          <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
          {ring && <span style={{ position: 'absolute', left: `calc(${ring.x * 100}% - 28px)`, top: `calc(${ring.y * 100}% - 28px)`, width: 56, height: 56, border: '2px solid var(--acc)', borderRadius: 12, pointerEvents: 'none' }} />}
          {caps.torch && <button type="button" className="iconbtn" onClick={e => { e.stopPropagation(); flip() }} aria-label={t('Flashlight')} aria-pressed={torch}
            style={{ position: 'absolute', top: 10, right: 10, background: torch ? 'var(--acc)' : 'rgba(0,0,0,.55)', color: torch ? 'var(--on-acc)' : '#fff' }}><Icon name="bolt" /></button>}
        </div>
        {caps.focusMode && <div className="small dim" style={{ marginTop: 6 }}>{t('Tap the preview to focus. For tiny barcodes, zoom in rather than moving closer.')}</div>}
        {caps.zoom && caps.zoom.max > caps.zoom.min && <div style={{ marginTop: 8 }}>
          <div className="small muted" style={{ marginBottom: 4 }}>{t('Zoom {0}×', Math.round(zoom * 10) / 10)}</div>
          <Slider aria-label={t('Zoom')} value={zoom} min={caps.zoom.min} max={Math.min(caps.zoom.max, 8)} step={caps.zoom.step || 0.1} onChange={setZ} />
        </div>}
      </>
      : <div className="small muted" style={{ marginBottom: 12 }}>{t('Automatic scanning isn’t supported here — type the number under the barcode.')}</div>}
    <div className="row" style={{ gap: 8, marginTop: 10 }}>
      <TextField inputMode="numeric" placeholder={t('Enter barcode (e.g. 3017624010701)')} value={code} onChange={e => setCode(e.target.value)} style={{ flex: 1 }} autoFocus={!('BarcodeDetector' in window)} />
      <Button size="sm" variant="tinted" onClick={() => find(code)}>{t('Look up')}</Button>
    </div>
    {msg && <div className="small muted" style={{ marginTop: 8 }}>{msg}</div>}
  </>
}

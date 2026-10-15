// On-device photo logging UI: model management (Settings), capture, and review.
// Mirrors fud-ai's flow: capture → analyse (local model) → review/edit → save. The model only
// recognises the dish; nutrition and the default portion come from USDA (lib/vision/dishes.js).
import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { t } from './lib/i18n.js'
import { fmtNum } from './lib/format.js'
import { addEntry, entryTotals, MEALS } from './lib/nutrition.js'
import { MODELS, downloadBytes, RUNTIME_BYTES } from './lib/vision/catalog.js'
import { MESSAGES } from './lib/vision/errors.js'
import { prepImage } from './lib/vision/image.js'
import { analyzeDish } from './lib/vision/analyzer.js'
import { useVision, refreshVision, installModel, cancelInstall, removeModel, classify, cancelClassify } from './lib/vision/client.js'
import { MEAL_LABEL, foodSearchSheet } from './nutrition-sheets.jsx'
import { Button, Segmented, Stepper, Row, Section } from './components/ui.jsx'

const ui = () => useUI.getState()
const toast = m => ui().toast(m)
const mb = b => Math.round((b || 0) / 1e6)
const quiet = e => { if (e?.kind !== 'CANCELLED') toast(t(e?.message || 'Something went wrong')) }
const pct = s => Math.round(s * 100) + '%'

function Progress({ loaded, total }) {
  const p = total ? Math.min(100, (loaded / total) * 100) : 0
  return <div role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}
    style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden', margin: '8px 0' }}>
    <div style={{ width: p + '%', height: '100%', background: 'linear-gradient(90deg,var(--acc),var(--acc-2))', transition: 'width .3s' }} />
  </div>
}

function statusLine(v) {
  const m = MODELS[v.modelId]
  switch (v.state) {
    case 'ready': case 'busy': return t('Installed · runs on {0}', v.device === 'webgpu' ? t('GPU') : t('CPU'))
    case 'downloading': return t('Downloading {0} / {1} MB', mb(v.loaded), mb(v.total))
    case 'verifying': return t('Verifying download…')
    case 'ineligible': return t(MESSAGES[v.reason])
    case 'failed': return v.error ? t(v.error) : t('Download failed')
    case 'absent': return t('{0} MB download · {1}', mb(downloadBytes(m, v.device || 'wasm') + RUNTIME_BYTES), m.license)
    default: return t('Checking…')
  }
}

function ModelActions({ v }) {
  if (v.state === 'ready') return <Button size="sm" variant="danger" onClick={() => removeModel().then(() => toast(t('Model removed')))}>{t('Delete')}</Button>
  if (v.state === 'downloading' || v.state === 'verifying') return <Button size="sm" variant="ghost" onClick={cancelInstall}>{t('Cancel')}</Button>
  if (v.state === 'absent' || v.state === 'failed') return <Button size="sm" variant="tinted"
    onClick={() => installModel().then(() => useVision.getState().state === 'ready' && toast(t('Model ready — works offline'))).catch(quiet)}>{t('Download')}</Button>
  return null
}

function ModelRow({ v }) {
  return <>
    <Row icon="camera" iconTint="var(--acc)" title={t(MODELS[v.modelId].label)} subtitle={statusLine(v)}><ModelActions v={v} /></Row>
    {(v.state === 'downloading' || v.state === 'verifying') && <Progress loaded={v.state === 'verifying' ? v.total : v.loaded} total={v.total} />}
  </>
}

/* ---------------------------------------------------------------- settings */
export function VisionSettings() {
  const v = useVision()
  useEffect(() => { refreshVision() }, [])
  return <Section title={t('On-device food recognition')}
    footer={t('Photos are analysed on this device and never uploaded. The model is downloaded once from Hugging Face ({0}) and then works offline. It recognises 101 common dishes.', MODELS[v.modelId].license)}>
    <ModelRow v={v} />
  </Section>
}

/* ------------------------------------------------------------ photo sheet */
export const photoSheet = (iso, meal) => ui().openSheet(close => <Photo iso={iso} meal={meal} close={close} />)

function Photo({ iso, meal, close }) {
  const v = useVision()
  const camRef = useRef(null), libRef = useRef(null)
  const [img, setImg] = useState(null)            // { blob, url }
  useEffect(() => { refreshVision() }, [])
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.url) }, [img])
  useEffect(() => () => cancelClassify(), [])

  const pickFile = async e => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try { const blob = await prepImage(f); setImg({ blob, url: URL.createObjectURL(blob) }) } catch (err) { quiet(err) }
  }
  const run = async () => {
    try {
      const r = await analyzeDish({ image: img.blob }, { classify })
      close()
      reviewSheet(iso, meal, r)
    } catch (e) { quiet(e) }
  }

  if (v.state !== 'ready' && v.state !== 'busy') return <>
    <h3>{t('Log food from a photo')}</h3>
    <div className="small muted" style={{ marginBottom: 12 }}>
      {t('Recognition runs entirely on your device — photos are never uploaded. Download the model once to start.')}
    </div>
    <ModelRow v={v} />
  </>

  return <>
    <h3>{t('Log food from a photo')}</h3>
    <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
    <input ref={libRef} type="file" accept="image/*" hidden onChange={pickFile} />
    {img
      ? <img src={img.url} alt={t('Meal photo')} style={{ width: '100%', borderRadius: 12, display: 'block', marginBottom: 10 }} />
      : <>
          <div className="small muted" style={{ marginBottom: 10 }}>{t('Best with one dish per photo, close up and well lit.')}</div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <Button variant="primary" icon="camera" onClick={() => camRef.current.click()}>{t('Take photo')}</Button>
            <Button variant="tinted" icon="upload" onClick={() => libRef.current.click()}>{t('Choose photo')}</Button>
          </div>
        </>}
    {img && v.state !== 'busy' && <div className="row" style={{ gap: 8 }}>
      <Button variant="ghost" onClick={() => setImg(null)}>{t('Retake')}</Button>
      <Button variant="primary" icon="sparkles" onClick={run}>{t('Recognise')}</Button>
    </div>}
    {v.state === 'busy' && <div className="small muted" style={{ margin: '8px 0' }}>{t('Recognising on your device…')}</div>}
  </>
}

/* ----------------------------------------------------------- review sheet */
const reviewSheet = (iso, meal, r) => ui().openSheet(close => <Review iso={iso} meal0={meal} r={r} close={close} />)

function Review({ iso, meal0, r, close }) {
  const [pick, setPick] = useState(r.pick)
  const [g, setG] = useState(r.g)
  const [meal, setMeal] = useState(meal0)
  const search = () => { close(); foodSearchSheet(iso, meal) }

  if (!r.options.length) return <>
    <h3>{t('Nothing recognised')}</h3>
    <div className="small muted" style={{ marginBottom: 12 }}>{t('This dish isn’t one the on-device model knows. Add it with search instead.')}</div>
    <Button variant="primary" icon="magnifier" onClick={search}>{t('Search foods')}</Button>
  </>

  const opt = r.options[pick], food = opt.food
  const tot = entryTotals({ g: g || 0, food })
  const choose = i => { setPick(i); setG(r.options[i].food.serving) }
  const save = () => {
    if (!(g > 0)) return toast(t('Enter an amount'))
    useStore.getState().update(s => addEntry(s, iso, { meal, g, food }))
    close()
    toast(t('Added to {0}', t(MEAL_LABEL[meal])))
  }
  return <>
    <h3>{r.unsure ? t('Is this right?') : food.name}</h3>
    {r.unsure && <div className="small muted" style={{ marginBottom: 8 }}>{t('The model isn’t sure — pick the closest dish or search instead.')}</div>}
    {r.options.length > 1 && <div style={{ margin: '4px 0 10px' }}>
      <Segmented value={pick} onChange={choose} options={r.options.map((o, i) => ({ value: i, label: `${t(o.food.name)} ${pct(o.score)}` }))} />
    </div>}
    <Stepper label={t('Amount')} unit="g" value={g} step={10} decimal={false} onChange={setG} />
    <Button size="sm" variant="ghost" onClick={() => setG(food.serving)}>{t('Typical portion ({0} g)', food.serving)}</Button>
    <div style={{ margin: '12px 0' }}><Segmented value={meal} onChange={setMeal} options={MEALS.map(m => ({ value: m, label: t(MEAL_LABEL[m]) }))} /></div>
    <div className="card row between" style={{ marginBottom: 6 }}>
      <b className="accent">{fmtNum(tot.kcal)} kcal</b>
      <span className="small muted">{t('P {0} g · C {1} g · F {2} g', fmtNum(tot.p), fmtNum(tot.c), fmtNum(tot.f))}</span>
    </div>
    <div className="small dim" style={{ marginBottom: 12 }}>{food.approx ? t('Approximate values: {0}', food.brand) : food.brand}</div>
    <Button variant="primary" onClick={save}>{t('Add')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" icon="magnifier" onClick={search}>{t('Not right? Search instead')}</Button>
  </>
}

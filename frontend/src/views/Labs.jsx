import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, todayISO } from '../lib/format.js'
import { MARKERS, CATEGORIES } from '../lib/labs/catalog.js'
import { fromCanonical, toCanonical, sameUnit } from '../lib/labs/units.js'
import { parseLabText } from '../lib/labs/parse.js'
import { reviewRows, buildReport, recentValues, recentReports, status, markerSeries, latestByMarker, ageAt, sexOf, guessUnits, byDate } from '../lib/labs/reports.js'
import { labScores } from '../lib/labs/scores.js'
import { confirmSheet } from '../sheets.jsx'
import { privacyScreen, readOnce } from '../lib/mobile.js'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button, Segmented, Section, Row, Check } from '../components/ui.jsx'

const update = (...a) => useStore.getState().update(...a)
const ui = () => useUI.getState()
const toast = m => ui().toast(m)

const fmt = (v, digits = null) => {
  if (!Number.isFinite(v)) return '–'
  const d = digits ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2)
  return v.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 })
}
// 10^9/L reads as ×10⁹/L on screen; stored units stay plain text
const pretty = u => String(u).replace(/^10\^9/, '×10⁹').replace(/^10\^12/, '×10¹²')
const shown = (key, v, sys) => { const r = fromCanonical(key, v, sys); return { ...r, unit: pretty(r.unit) } }
const STATUS = { high: 'High', low: 'Low', in: 'In range' }
const rangeText = (key, m, sys) => {
  const lo = m.lo != null ? fmt(shown(key, m.lo, sys).v) : null, hi = m.hi != null ? fmt(shown(key, m.hi, sys).v) : null
  return lo != null && hi != null ? `${lo}–${hi}` : hi != null ? `< ${hi}` : lo != null ? `> ${lo}` : ''
}

/* ---------------- import: PDF → text → rows → review ---------------- */

// A PDF with a text layer is read directly. A scanned PDF (no usable text) and a photo go through
// on-device OCR, which takes a few seconds, so a progress sheet stays up while it runs.
const MAX_FILE = 25 * 1024 * 1024   // a lab report is well under this; bigger files would stall a phone
async function importFile(file) {
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)
  if (file.size > MAX_FILE) { toast(t('That file is too large for a lab report (over 25 MB).')); return }
  try { file = await readOnce(file) } catch { toast(isPdf ? t('Couldn’t read that PDF.') : t('Couldn’t read that photo.')); return }
  ui().openSheet(close => <ReadingSheet file={file} isPdf={isPdf} close={close} />, { locked: true })
}

function ReadingSheet({ file, isPdf, close }) {
  const [msg, setMsg] = useState(t('Reading the report…'))
  const [pct, setPct] = useState(null)
  const live = useRef(true)
  const cancel = async () => {
    live.current = false
    close()
    const { cancelOcr } = await import('../lib/labs/ocr.js')
    cancelOcr()
  }
  useEffect(() => {
    live.current = true
    const progress = p => live.current && setPct(Math.round(p * 100))
    ;(async () => {
      const mdy = /^en-US$/i.test(navigator.language || '')
      let text = '', ocr = false, kind = isPdf ? 'PDF' : 'Photo'
      const unsure = new Set()
      if (isPdf) {
        const { pdfText } = await import('../lib/labs/pdf.js')
        const data = await file.arrayBuffer()
        text = await pdfText(data.slice(0))
        if (!live.current) return
        if (text.replace(/\s/g, '').length < 40) {   // no text layer at all: a scan
          live.current && setMsg(t('This PDF is a scan. Reading it with OCR on this device…'))
          const { ocrPdfPages } = await import('../lib/labs/ocr.js')
          text = await ocrPdfPages(data, progress, unsure); ocr = true; kind = 'Scan'
        }
      } else {
        live.current && setMsg(t('Reading the photo with OCR on this device…'))
        const { ocrText, preparePhoto } = await import('../lib/labs/ocr.js')
        const img = await preparePhoto(file)
        if (!live.current) return
        text = await ocrText(img, progress, unsure); ocr = true
      }
      const parsed = parseLabText(text, { mdy, ocr })
      if (ocr) {
        const shaky = new Set([...unsure].map(l => l.replace(/\t/g, '  ')))   // same form as row.raw
        parsed.rows = parsed.rows.map(r => ({ ...r, unsure: shaky.has(r.raw), unit: tidyUnit(r.key, r.unit) }))
      }
      if (!live.current) return
      close()
      if (!parsed.rows.length) { toast(t('No results found in that file.')); return }
      // locked: Escape or a tap outside must not throw away the reading and the person's edits
      ui().openSheet(c => <ReviewSheet parsed={parsed} kind={kind} ocr={ocr} close={c} />, { locked: true })
    })().catch(e => {
      if (!live.current) return
      close()
      toast(e?.message === 'too-large' ? t('That photo is too large (over 120 megapixels).') : isPdf ? t('Couldn’t read that PDF.') : t('Couldn’t read that photo.'))
    })
    return () => { live.current = false }
  }, [])
  return <div className="lab-reading">
    <h3>{msg}</h3>
    <div className="lab-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined} aria-label={t('Reading progress')}><span style={{ width: (pct ?? 8) + '%' }} /></div>
    <p className="muted small" aria-live="polite">{pct != null ? `${pct}%` : t('Nothing leaves this device.')}</p>
    <Button onClick={cancel}>{t('Cancel')}</Button>
  </div>
}

// An OCR'd unit ("Kul") shown in the catalogue's spelling when it is the same unit.
function tidyUnit(key, unit) {
  const d = key && MARKERS[key]
  if (!d || !unit) return unit
  if (sameUnit(unit, d.unit)) return d.unit
  return d.alt.find(a => sameUnit(a.unit, unit))?.unit || unit
}

function unitOptions(key, current) {
  const d = MARKERS[key]
  if (!d) return [current]
  const list = [...new Set([d.unit, ...d.alt.map(a => a.unit)].filter(Boolean))]
  return current && !list.some(u => u.toLowerCase() === current.toLowerCase()) ? [current, ...list] : list
}

// The text the person types is kept as typed ("5." on the way to "5.4"); the number is taken from it.
function ValueInput({ value, onValue }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => { const n = parseFloat(text.replace(',', '.')); if (n !== value && !(value == null && Number.isNaN(n))) setText(value == null ? '' : String(value)) }, [value])
  return <input className="lab-num" inputMode="decimal" value={text} aria-label={t('Value')}
    onChange={e => {
      const s = e.target.value
      if (!/^[-+]?\d*[.,]?\d*$/.test(s)) return
      setText(s)
      const n = parseFloat(s.replace(',', '.'))
      onValue(Number.isFinite(n) ? n : null)
    }} />
}

// What needs a look, as a short tag; the sheet explains the tags once at the top.
const TAGS = { unitOk: 'Pick unit', fixed: 'Decimal added', unitGuessed: 'Unit filled in', unsure: 'Unclear', dup: 'Duplicate' }
const LEGEND = { fixed: 'Decimal added: the number as read was not possible.', unitGuessed: 'Unit filled in: missing or unreadable.', unsure: 'Unclear: OCR was unsure.', unitOk: 'Pick unit: not a unit we know for this test.' }
const tagsOf = r => [r.key && !r.unitOk && 'unitOk', r.fixed && 'fixed', r.unitGuessed && 'unitGuessed', r.unsure && !r.fixed && 'unsure', r.dup && 'dup'].filter(Boolean)

function ReviewSheet({ parsed, kind, ocr = false, close }) {
  const [rows, setRows] = useState(() => reviewRows(parsed.rows))
  const [date, setDate] = useState(parsed.date || '')
  const [showOther, setShowOther] = useState(false)
  const set = (i, patch) => setRows(rs => rs.map((r, j) => {
    if (j !== i) return r
    const n = { ...r, ...patch }
    if (patch.key === 'biochemistry.urea' && !n.basis) n.basis = /bun|nitrogen/i.test(n.name) ? 'bun' : 'urea'
    n.unitOk = n.key ? toCanonical(n.key, n.value, n.unit, n.basis).ok : false
    if (!n.unitOk || !n.key) n.include = false
    else if ('key' in patch || 'unit' in patch || ('value' in patch && Number.isFinite(n.value))) n.include = true
    return n
  }))
  const order = ([a], [b]) => (tagsOf(b).length ? 1 : 0) - (tagsOf(a).length ? 1 : 0)   // rows needing a look first
  const matched = rows.map((r, i) => [r, i]).filter(([r]) => r.key).sort(order)
  const other = rows.map((r, i) => [r, i]).filter(([r]) => !r.key)
  const count = rows.filter(r => r.include).length
  const flagged = matched.filter(([r]) => tagsOf(r).length).length
  const present = Object.keys(LEGEND).filter(k => matched.some(([r]) => tagsOf(r).includes(k)))   // explain only the tags on screen

  const save = () => {
    const rep = buildReport(rows, { date, src: kind, dob: parsed.dob })
    update(S => {
      S.labs.reports.push(rep)
      if (!S.labs.units) S.labs.units = guessUnits(rows)
    })
    close()
    toast(t('{0} results saved', rep.markers.length))
  }

  const line = ([r, i]) => (
    <div key={i} className={'lab-rev' + (tagsOf(r).length ? ' flagged' : '')}>
      <Check checked={r.include} onChange={v => r.unitOk && set(i, { include: v })} aria-label={t('Save {0}', r.key ? t(MARKERS[r.key].name) : r.name)} />
      <div className="lab-rev-m">
        {r.key
          ? <div className="lab-rev-n">{t(MARKERS[r.key].name)}{r.name.toLowerCase() !== MARKERS[r.key].name.toLowerCase() && <span className="dim"> · {r.name}</span>}</div>
          : <select className="lab-sel" value="" onChange={e => set(i, { key: e.target.value || null, unit: r.unit })} aria-label={t('Which marker is {0}?', r.name)}>
              <option value="">{r.name} — {t('choose a marker')}</option>
              {Object.entries(CATEGORIES).map(([c, label]) => (
                <optgroup key={c} label={t(label)}>
                  {Object.entries(MARKERS).filter(([, d]) => d.cat === c).map(([k, d]) => <option key={k} value={k}>{t(d.name)}</option>)}
                </optgroup>))}
            </select>}
        <div className="lab-rev-v">
          <ValueInput value={r.value} onValue={v => set(i, { value: v })} />
          {r.key && <select className="lab-sel" value={r.unit} onChange={e => set(i, { unit: e.target.value })} aria-label={t('Unit')}>
            {unitOptions(r.key, r.unit).map(u => <option key={u} value={u}>{u || t('no unit')}</option>)}
          </select>}
          {r.key === 'biochemistry.urea' && sameUnit(r.unit, 'mg/dL') && <select className="lab-sel" value={r.basis || 'bun'} onChange={e => set(i, { basis: e.target.value })} aria-label={t('Urea or BUN')}>
            <option value="bun">BUN</option><option value="urea">{t('Urea')}</option>
          </select>}
          {(r.lo != null || r.hi != null) && <span className="dim small">{t('Range')} {r.lo ?? ''}{r.lo != null && r.hi != null ? '–' : ''}{r.hi != null ? (r.lo == null ? '< ' : '') + r.hi : ''}</span>}
          {tagsOf(r).map(k => <span key={k} className="lab-tag">{t(TAGS[k])}</span>)}
        </div>
      </div>
    </div>
  )

  return <>
    <h3>{t('Check the results')}</h3>
    <p className="muted small">{t('Read on this device. Nothing was uploaded. Fix anything that looks wrong before saving.')}</p>
    {(ocr || flagged > 0) && <p className="small lab-legend">
      {ocr && <span className="lab-warn">{t('Read with OCR: compare every value with the report.')} </span>}
      {flagged > 0 && <>{t('{0} rows need a look and are listed first, unticked.', flagged)} {present.map(k => t(LEGEND[k])).join(' ')}</>}
    </p>}
    <label className="lab-date">{t('Sample date')}<input type="date" value={date} max={todayISO()} required onChange={e => setDate(e.target.value)} /></label>
    {!parsed.date && <p className="lab-warn small">{t('The sample date wasn’t found on the report. Set the date the blood was taken.')}</p>}
    <div className="lab-list">{matched.map(line)}</div>
    {other.length > 0 && <>
      <button type="button" className="lab-more" onClick={() => setShowOther(v => !v)} aria-expanded={showOther}>
        {t('{0} rows not recognised', other.length)} <Icon name={showOther ? 'chevronUp' : 'chevronDown'} />
      </button>
      {showOther && <div className="lab-list">{other.map(line)}</div>}
    </>}
    <div className="row lab-rev-foot" style={{ gap: 8 }}>
      <Button onClick={() => confirmSheet({ title: t('Discard this reading?'), message: t('Nothing from this report will be saved.'), confirmText: t('Discard'), danger: true, onConfirm: close })}>{t('Cancel')}</Button>
      <Button variant="primary" onClick={save} disabled={!count || !date}>{!date ? t('Set the sample date') : t('Save {0} results', count)}</Button>
    </div>
  </>
}

/* ---------------- one marker over time ---------------- */

function MarkerSheet({ markerKey, close }) {
  const S = useStore(s => s.S)
  const sys = S.labs.units || 'si'
  const d = MARKERS[markerKey]
  const series = markerSeries(S.labs.reports, markerKey)
  const unit = shown(markerKey, series[0]?.m.v ?? 0, sys).unit
  const points = series.map(p => ({ t: p.t, y: shown(markerKey, p.m.v, sys).v, d: p.d }))
  return <>
    <h3>{t(d.name)}</h3>
    {points.length > 1 ? <LineChart points={points} unit={unit} h={170} /> : <p className="muted small">{t('One reading so far. Import another report to see a trend.')}</p>}
    <Section>
      {[...series].reverse().map(p => {
        const st = status(p.m)
        return <Row key={p.report.id} title={fmtDate(p.d, true)} subtitle={[rangeText(markerKey, p.m, sys) && `${t('Range')} ${rangeText(markerKey, p.m, sys)}`, p.report.lab || p.report.src].filter(Boolean).join(' · ')}
          value={<span>{p.m.cmp || ''}{fmt(shown(markerKey, p.m.v, sys).v)} {unit} {st && st !== 'in' && <span className={'lab-st ' + st}>{t(STATUS[st])}</span>}</span>} />
      })}
    </Section>
    <Button onClick={close}>{t('Done')}</Button>
  </>
}

/* ---------------- scores ---------------- */

function ScoreRow({ s, sys }) {
  const [open, setOpen] = useState(false)
  const val = sys === 'us' && s.us ? `${fmt(s.value * s.us.f, s.us.digits)} ${s.us.unit}` : `${fmt(s.value, s.digits)}${s.unit ? ' ' + s.unit : ''}`
  return <div className="lab-score">
    <button type="button" className="lrow tap" onClick={() => setOpen(v => !v)} aria-expanded={open}>
      <span className="lrow-m"><span className="lrow-t">{t(s.name)}</span><span className="lrow-s">{t(s.what)}</span></span>
      <span className="lrow-v">{val}<br /><span className={'lab-band ' + s.band.level}>{t(s.band.label)}</span></span>
      <Icon name={open ? 'chevronUp' : 'chevronDown'} className="lrow-c" />
    </button>
    {open && <div className="lab-score-d small">
      <div><b>{t('Formula')}:</b> {t(s.formula)}</div>
      {s.note && <div>{t(s.note)}</div>}
      <div className="dim">{t('Source')}: {s.source}</div>
    </div>}
  </div>
}

/* ---------------- the page ---------------- */

export default function Labs() {
  useEffect(() => { privacyScreen(true); return () => privacyScreen(false) }, [])   // results stay out of screenshots and recents
  const S = useStore(s => s.S)
  const fileRef = useRef(null)
  const reports = byDate(S.labs?.reports || [])
  const sys = S.labs?.units || 'si'
  const latestReport = reports[reports.length - 1]
  // each marker's latest reading from the last 120 days, so a later partial report keeps the scores
  const born = [...reports].reverse().find(r => r.birthYear || r.dob)
  const age = latestReport ? ageAt(S, { d: latestReport.d, birthYear: born?.birthYear, dob: born?.dob }) : null
  const scores = latestReport ? labScores(recentValues(reports, 120), { age, sex: sexOf(S) }) : []
  const first = recentReports(reports, 120)[0]   // the scores mix values from every report in this window
  const scoreDates = latestReport && (first.d === latestReport.d ? fmtDate(latestReport.d, true) : `${fmtDate(first.d, true)} – ${fmtDate(latestReport.d, true)}`)
  const latest = latestByMarker(reports)
  const photoRef = useRef(null)
  const pick = () => fileRef.current?.click()
  const pickPhoto = () => photoRef.current?.click()
  // read before clearing the input: on Android clearing it revokes access to a picked file
  const onFile = async e => { const input = e.target, f = input.files?.[0]; if (f) await importFile(f); input.value = '' }
  const del = r => confirmSheet({
    title: t('Delete this report?'), message: t('{0} results from {1} will be removed.', r.markers.length, fmtDate(r.d, true)),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => update(s => { s.labs.reports = s.labs.reports.filter(x => x.id !== r.id) })
  })

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{t('Blood tests')}</h1><div className="sub">{t('Read on this device. Never uploaded.')}</div></div>
      <div className="row" style={{ gap: 6 }}>
        <button className="iconbtn" onClick={pickPhoto} aria-label={t('Photograph a lab report')}><Icon name="camera" /></button>
        <button className="iconbtn" onClick={pick} aria-label={t('Import a lab report PDF')}><Icon name="upload" /></button>
      </div>
    </div>
    <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={onFile} />
    <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />

    {!reports.length && <div className="card lab-empty">
      <Icon name="heart" />
      <h2>{t('Bring in your blood tests')}</h2>
      <p className="muted">{t('Import a lab report PDF or take a photo of a printed one. OPENFIT reads it on this device, you check the values, and every marker gets a chart over time, plus published scores such as HOMA-IR and a biological age estimate.')}</p>
      <div className="lab-actions">
        <Button variant="primary" icon="upload" onClick={pick}>{t('Import a PDF')}</Button>
        <Button icon="camera" onClick={pickPhoto}>{t('Take a photo')}</Button>
      </div>
    </div>}

    {reports.length > 0 && <>
      <Segmented className="lab-units" options={[{ value: 'si', label: t('SI units') }, { value: 'us', label: t('US units') }]} value={sys}
        onChange={v => update(s => { s.labs.units = v })} />

      {scores.length > 0 && <Section title={`${t('Scores')} · ${scoreDates}`}
        footer={t('Published formulas, for information only. Not medical advice: talk to your doctor about your results.')}>
        {scores.map(s => <ScoreRow key={s.id} s={s} sys={sys} />)}
      </Section>}
      {latestReport && !Number.isFinite(age) && <p className="dim small">{t('Set your birth year in My Meals to see FIB-4 and biological age.')}</p>}

      {Object.entries(CATEGORIES).map(([c, label]) => {
        const items = latest.filter(x => MARKERS[x.key].cat === c)
        if (!items.length) return null
        return <Section key={c} title={t(label)}>
          {items.map(({ key, m, report }) => {
            const st = status(m), v = shown(key, m.v, sys)
            return <Row key={key} title={t(MARKERS[key].name)} accessory="chevron"
              subtitle={[rangeText(key, m, sys) && `${t('Range')} ${rangeText(key, m, sys)}`, report.id !== latestReport.id && fmtDate(report.d, true)].filter(Boolean).join(' · ')}
              value={<span>{m.cmp || ''}{fmt(v.v)} {v.unit} {st && st !== 'in' && <span className={'lab-st ' + st}>{t(STATUS[st])}</span>}</span>}
              onClick={() => ui().openSheet(close => <MarkerSheet markerKey={key} close={close} />)} />
          })}
        </Section>
      })}

      <Section title={t('Reports')}>
        {[...reports].reverse().map(r => <Row key={r.id} icon="clipboard" title={fmtDate(r.d, true)}
          subtitle={`${t('{0} results', r.markers.length)}${r.src ? ' · ' + r.src : ''}`}>
          <button className="iconbtn" onClick={() => del(r)} aria-label={t('Delete report from {0}', fmtDate(r.d, true))}><Icon name="trash" /></button>
        </Row>)}
      </Section>
      <div className="lab-actions">
        <Button icon="upload" onClick={pick}>{t('Import a PDF')}</Button>
        <Button icon="camera" onClick={pickPhoto}>{t('Take a photo')}</Button>
      </div>
    </>}
  </div>
}

import { useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, todayISO } from '../lib/format.js'
import { MARKERS, CATEGORIES } from '../lib/labs/catalog.js'
import { fromCanonical, toCanonical } from '../lib/labs/units.js'
import { parseLabText } from '../lib/labs/parse.js'
import { reviewRows, buildReport, reportValues, status, markerSeries, latestByMarker, ageAt, sexOf, guessUnits, byDate } from '../lib/labs/reports.js'
import { labScores } from '../lib/labs/scores.js'
import { confirmSheet } from '../sheets.jsx'
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

async function importPdf(file) {
  try {
    const { pdfText } = await import('../lib/labs/pdf.js')
    const text = await pdfText(await file.arrayBuffer())
    const mdy = /^en-US$/i.test(navigator.language || '')
    const parsed = parseLabText(text, { mdy })
    if (!parsed.rows.length) {
      toast(t('No results found. Scanned reports and photos need OCR, which is coming later.'))
      return
    }
    ui().openSheet(close => <ReviewSheet parsed={parsed} src={file.name} close={close} />)
  } catch (e) {
    toast(t('Couldn’t read that PDF.'))
  }
}

function unitOptions(key, current) {
  const d = MARKERS[key]
  if (!d) return [current]
  const list = [d.unit, ...d.alt.map(a => a.unit)].filter(Boolean)
  return current && !list.some(u => u.toLowerCase() === current.toLowerCase()) ? [current, ...list] : list
}

function ReviewSheet({ parsed, src, close }) {
  const [rows, setRows] = useState(() => reviewRows(parsed.rows))
  const [date, setDate] = useState(parsed.date || todayISO())
  const [showOther, setShowOther] = useState(false)
  const set = (i, patch) => setRows(rs => rs.map((r, j) => {
    if (j !== i) return r
    const n = { ...r, ...patch }
    n.unitOk = n.key ? toCanonical(n.key, n.value, n.unit).ok : false
    if (!n.unitOk || !n.key) n.include = false
    else if ('key' in patch || 'unit' in patch) n.include = true
    return n
  }))
  const matched = rows.map((r, i) => [r, i]).filter(([r]) => r.key)
  const other = rows.map((r, i) => [r, i]).filter(([r]) => !r.key)
  const count = rows.filter(r => r.include).length

  const save = () => {
    const rep = buildReport(rows, { date, src, dob: parsed.dob })
    update(S => {
      S.labs.reports.push(rep)
      if (!S.labs.units) S.labs.units = guessUnits(rows)
    })
    close()
    toast(t('{0} results saved', rep.markers.length))
  }

  const line = ([r, i]) => (
    <div key={i} className="lab-rev">
      <Check checked={r.include} onChange={v => r.unitOk && set(i, { include: v })} aria-label={t('Include')} />
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
          <input className="lab-num" inputMode="decimal" value={String(r.value)} aria-label={t('Value')}
            onChange={e => { const v = parseFloat(e.target.value.replace(',', '.')); if (Number.isFinite(v)) set(i, { value: v }) }} />
          {r.key && <select className="lab-sel" value={r.unit} onChange={e => set(i, { unit: e.target.value })} aria-label={t('Unit')}>
            {unitOptions(r.key, r.unit).map(u => <option key={u} value={u}>{u || t('no unit')}</option>)}
          </select>}
          {(r.lo != null || r.hi != null) && <span className="dim small">{t('Range')} {r.lo ?? ''}{r.lo != null && r.hi != null ? '–' : ''}{r.hi != null ? (r.lo == null ? '< ' : '') + r.hi : ''}</span>}
        </div>
        {r.key && !r.unitOk && <div className="lab-warn small">{t('Unit not recognised for this marker. Pick the unit printed on the report.')}</div>}
        {r.dup && <div className="dim small">{t('Already in this report; only the first is saved.')}</div>}
      </div>
    </div>
  )

  return <>
    <h3>{t('Check the results')}</h3>
    <p className="muted small">{t('Read on this device from {0}. Nothing was uploaded. Fix anything that looks wrong before saving.', src)}</p>
    <label className="lab-date">{t('Sample date')}<input type="date" value={date} max={todayISO()} onChange={e => setDate(e.target.value)} /></label>
    <div className="lab-list">{matched.map(line)}</div>
    {other.length > 0 && <>
      <button type="button" className="lab-more" onClick={() => setShowOther(v => !v)} aria-expanded={showOther}>
        {t('{0} rows not recognised', other.length)} <Icon name={showOther ? 'chevronUp' : 'chevronDown'} />
      </button>
      {showOther && <div className="lab-list">{other.map(line)}</div>}
    </>}
    <div className="row" style={{ gap: 8, marginTop: 14 }}>
      <Button onClick={close}>{t('Cancel')}</Button>
      <Button variant="primary" onClick={save} disabled={!count || !date}>{t('Save {0} results', count)}</Button>
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
  const S = useStore(s => s.S)
  const fileRef = useRef(null)
  const reports = byDate(S.labs?.reports || [])
  const sys = S.labs?.units || 'si'
  const latestReport = reports[reports.length - 1]
  const scores = latestReport ? labScores(reportValues(latestReport), { age: ageAt(S, latestReport), sex: sexOf(S) }) : []
  const latest = latestByMarker(reports)
  const pick = () => fileRef.current?.click()
  const onFile = e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importPdf(f) }
  const del = r => confirmSheet({
    title: t('Delete this report?'), message: t('{0} results from {1} will be removed.', r.markers.length, fmtDate(r.d, true)),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => update(s => { s.labs.reports = s.labs.reports.filter(x => x.id !== r.id) })
  })

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{t('Blood tests')}</h1><div className="sub">{t('Read on this device. Never uploaded.')}</div></div>
      <button className="iconbtn" onClick={pick} aria-label={t('Import a lab report')}><Icon name="upload" /></button>
    </div>
    <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={onFile} />

    {!reports.length && <div className="card lab-empty">
      <Icon name="heart" />
      <h2>{t('Bring in your blood tests')}</h2>
      <p className="muted">{t('Import a lab report PDF. OPENFIT reads it on this device, you check the values, and every marker gets a chart over time, plus published scores such as HOMA-IR and a biological age estimate.')}</p>
      <Button variant="primary" icon="upload" onClick={pick}>{t('Import a lab report (PDF)')}</Button>
    </div>}

    {reports.length > 0 && <>
      <Segmented className="lab-units" options={[{ value: 'si', label: t('SI units') }, { value: 'us', label: t('US units') }]} value={sys}
        onChange={v => update(s => { s.labs.units = v })} />

      {scores.length > 0 && <Section title={`${t('Scores')} · ${fmtDate(latestReport.d, true)}`}
        footer={t('Published formulas, for information only. Not medical advice: talk to your doctor about your results.')}>
        {scores.map(s => <ScoreRow key={s.id} s={s} sys={sys} />)}
      </Section>}
      {latestReport && !Number.isFinite(ageAt(S, latestReport)) && <p className="dim small">{t('Set your birth year in My Meals to see FIB-4 and biological age.')}</p>}

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
      <Button icon="upload" onClick={pick}>{t('Import another report')}</Button>
    </>}
  </div>
}

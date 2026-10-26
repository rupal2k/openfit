import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { EXDB, BODYPARTS, allExercises, equipmentOf } from '../lib/exercises.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button, SelectChip } from '../components/ui.jsx'

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

export default function Library() {
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [eq, setEq] = useState('')
  const [shown, setShown] = useState(40)
  const ql = q.toLowerCase().trim()
  const base = allExercises(S).filter(e => (!bp || e.bp === bp) && (!ql || e.n.toLowerCase().includes(ql) || e.tg.includes(ql) || e.eq.includes(ql) || (e.desc || '').toLowerCase().includes(ql)))
  const eqOpts = equipmentOf(base)
  // Drop the equipment filter if the search narrowed it away, so you never hit a dead end.
  const eqOn = eqOpts.includes(eq) ? eq : ''
  const f = eqOn ? base.filter(e => e.eq === eqOn) : base

  return <>
    <div className="hdr"><div><h1>{t('Exercises')}</h1><div className="sub">{t('{0} exercises with animations', EXDB.length)}</div></div></div>
    <div className="search" style={{ marginBottom: 10 }}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search…')} aria-label={t('Search exercises')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} /></div>
    {/* dropdowns instead of chip rows: two scrolling rows got cut off at the screen edge */}
    <div className="filters">
      <SelectChip label={t('Body part')} value={bp} none=""
        options={[{ value: '', label: t('All') }, ...BODYPARTS.map(b => ({ value: b, label: cap(t(b)) }))]}
        onChange={v => { setBp(v); setEq(''); setShown(40) }} />
      {eqOpts.length > 1 && <SelectChip label={t('Equipment')} value={eqOn} none=""
        options={[{ value: '', label: t('Any') }, ...eqOpts.map(x => ({ value: x, label: cap(t(x)) }))]}
        onChange={v => { setEq(v); setShown(40) }} />}
    </div>
    <div className="list">
      <div className="item" onClick={() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim())}>
        <div className="thumb thumb-x"><Icon name="sparkles" /></div>
        <div className="grow"><div className="tt">{t('Create your own exercise')}</div><div className="ss">{t('name + body part, no animation')}</div></div><Icon name="plus" className="chev" />
      </div>
      {f.slice(0, shown).map(e => {
        const best = bestWeightFor(S, e.id)
        return <div key={e.id} className="item" onClick={() => exerciseDetailSheet(e)}>
          <Thumb ex={e} />
          <div className="grow"><div className="tt capitalize">{e.n}</div><div className="ss capitalize">{t(e.tg || e.bp)} · {t(e.eq)}</div></div>
          {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
          <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
        </div>
      })}
      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
    </div>
    {f.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
  </>
}

import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { targets, dayTotals, entryTotals, MEALS } from '../lib/nutrition.js'
import { todayISO, isoOf, fmtNum, fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { nutritionProfileSheet, foodSearchSheet, foodAmountSheet, barcodeSheet, MEAL_LABEL } from '../nutrition-sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

const shift = (iso, days) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days); return isoOf(d) }

function Bar({ label, val, goal, unit }) {
  const pct = goal ? Math.min(100, (val / goal) * 100) : 0
  const over = goal && val > goal
  return <div style={{ flex: 1, minWidth: 0 }}>
    <div className="small muted">{label}</div>
    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.9rem' }}>{fmtNum(val)}{goal ? <span className="dim"> / {goal}</span> : null} {unit}</div>
    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', marginTop: 4, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: over ? 'var(--orange)' : 'var(--acc)' }} />
    </div>
  </div>
}

export default function Nutrition() {
  const S = useStore(s => s.S)
  const [iso, setIso] = useState(todayISO())
  const entries = S.nutrition.days[iso] || []
  const tot = dayTotals(entries)
  const goal = targets(S)
  const isToday = iso === todayISO()

  const defaultMeal = () => {
    const h = new Date().getHours() + new Date().getMinutes() / 60
    if (h < 10.5) return 'breakfast'
    if (h < 15) return 'lunch'
    if (h < 21) return 'dinner'
    return 'snack'
  }

  return <div className="narrow">
    <div className="hdr">
      <div><h1>{t('Food')}</h1><div className="sub">{isToday ? t('Today') : fmtDate(iso, true)}</div></div>
      <div className="row" style={{ gap: 6 }}>
        <button className="iconbtn" onClick={() => barcodeSheet(iso, defaultMeal())} aria-label={t('Scan barcode')}><Icon name="barcode" /></button>
        <button className="iconbtn" onClick={nutritionProfileSheet} aria-label={t('Targets')}><Icon name="target" /></button>
      </div>
    </div>

    <div className="card">
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setIso(shift(iso, -1))} aria-label={t('Previous day')}><Icon name="chevronLeft" /></button>
        <div className="small muted" style={{ fontWeight: 500 }}>{fmtDate(iso, true)}</div>
        <button className="iconbtn" style={{ width: 30, height: 30, fontSize: 15 }} onClick={() => setIso(shift(iso, 1))} disabled={isToday} aria-label={t('Next day')}><Icon name="chevronRight" /></button>
      </div>
      <Bar label={t('Calories')} val={tot.kcal} goal={goal?.kcal} unit="kcal" />
      <div className="row" style={{ gap: 12, marginTop: 10 }}>
        <Bar label={t('Protein')} val={tot.p} goal={goal?.protein} unit="g" />
        <Bar label={t('Carbs')} val={tot.c} goal={goal?.carbs} unit="g" />
        <Bar label={t('Fat')} val={tot.f} goal={goal?.fat} unit="g" />
      </div>
      {!goal && <Button size="sm" variant="tinted" icon="target" style={{ marginTop: 12 }} onClick={nutritionProfileSheet}>{t('Set your targets')}</Button>}
    </div>

    {MEALS.map(m => {
      const list = entries.filter(e => e.meal === m)
      const kcal = dayTotals(list).kcal
      return <section className="sect" key={m}>
        <h2 className="sect-t" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{t(MEAL_LABEL[m])}</span>{kcal > 0 && <span className="dim">{fmtNum(kcal)} kcal</span>}</h2>
        <div className="sect-b">
          {list.map(e => <button key={e.id} className="lrow tap" onClick={() => foodAmountSheet(iso, m, e.food, e)}>
            <span className="lrow-m"><span className="lrow-t">{e.food.name}</span><span className="lrow-s">{e.g} g</span></span>
            <span className="lrow-v">{fmtNum(entryTotals(e).kcal)} kcal</span>
          </button>)}
          <button className="lrow tap" onClick={() => foodSearchSheet(iso, m)}>
            <span className="lrow-i"><Icon name="plus" /></span>
            <span className="lrow-m"><span className="lrow-t">{t('Add food')}</span></span>
          </button>
        </div>
      </section>
    })}
    <div className="small dim" style={{ textAlign: 'center', margin: '16px 0 90px' }}>{t('Food data © Open Food Facts contributors, ODbL')}</div>
  </div>
}

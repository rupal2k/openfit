// Nutrition sheets: targets set-up, food search, amount, custom food, barcode scan.
// Kept apart from sheets.jsx (workouts/plan), which is already 1,200 lines.
import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { t } from './lib/i18n.js'
import { fmtNum, uid } from './lib/format.js'
import { targets, bodyKg, entryTotals, addEntry, updateEntry, removeEntry, recentFoods, MEALS } from './lib/nutrition.js'
import { searchFoods, lookupBarcode, SEARCH_OK } from './lib/food.js'
import { bwSheet } from './sheets.jsx'
import Icon from './components/Icon.jsx'
import { Button, Segmented, SelectRow, NumberField, Row, Stepper, SearchField, TextField } from './components/ui.jsx'

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
  const save = () => { update(s => { s.nutrition.profile = p }); close(); toast(t('Targets saved')) }
  return <>
    <h3>{t('Your targets')}</h3>
    <Row title={t('Sex')}><Segmented className="seg-inline" value={p.sex} onChange={set('sex')}
      options={[{ value: 'male', label: t('Male') }, { value: 'female', label: t('Female') }, { value: 'other', label: t('Other') }]} /></Row>
    <Row title={t('Birth year')}><NumberField decimal={false} nullable value={p.birthYear} onChange={set('birthYear')} placeholder="1990" /></Row>
    <Row title={t('Height (cm)')}><NumberField decimal={false} nullable value={p.heightCm} onChange={set('heightCm')} placeholder="175" /></Row>
    <Row title={t('Body weight')} value={w ? fmtNum(w) + ' kg' : t('Not logged')} accessory="chevron" onClick={() => bwSheet()} />
    <SelectRow title={t('Activity')} value={p.pal} onChange={set('pal')} options={[
      { value: 'sedentary', label: t('Sedentary'), subtitle: t('Desk job, little walking') },
      { value: 'low', label: t('Lightly active'), subtitle: t('Some walking, training 1–3× a week') },
      { value: 'active', label: t('Active'), subtitle: t('On your feet a lot, training 3–5× a week') },
      { value: 'very', label: t('Very active'), subtitle: t('Physical job or training daily') }]} />
    <Row title={t('Goal')}><Segmented className="seg-inline" value={p.goal} onChange={set('goal')}
      options={[{ value: 'lose', label: t('Lose') }, { value: 'maintain', label: t('Maintain') }, { value: 'gain', label: t('Gain') }]} /></Row>
    <Row title={t('Calorie override')} subtitle={t('Leave empty to calculate')}>
      <NumberField decimal={false} nullable value={p.kcal} onChange={set('kcal')} placeholder="—" /></Row>
    <div className="card" style={{ margin: '12px 0' }}>
      {preview
        ? <div className="row between"><b className="accent">{preview.kcal} kcal</b>
            <span className="small muted">{t('P {0} g · C {1} g · F {2} g', preview.protein, preview.carbs, preview.fat)}</span></div>
        : <div className="small muted">{t('Add birth year, height and a weigh-in — or set a calorie override.')}</div>}
    </div>
    <Button variant="primary" onClick={save}>{t('Save')}</Button>
    <div className="small dim" style={{ marginTop: 8 }}>{t('Estimate from the IOM 2005 equations, as used by OpenNutriTracker. Protein: 1.6 g per kg body weight.')}</div>
  </>
}

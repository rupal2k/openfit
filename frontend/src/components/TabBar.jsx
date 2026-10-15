import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutine } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  const cur = loc.pathname.split('/')[1] || 'home'
  const fab = (user || isGuest) && cur !== 'workout'
  if (!user && !isGuest) return null
  const on = k => cur === k || (cur === 'history' && k === 'stats') || (cur === 'settings' && k === 'home')

  const startWorkout = () => {
    if (!S.active) {
      const r = effectiveRoutine(S, todayISO())
      if (r && r.ex.length) { onStart(r.id); return }
    }
    nav('/workout')
  }
  const Tab = ({ k, icon, to, label }) => (
    <button className={on(k) ? 'on' : ''} onClick={() => nav(to)}>
      <Icon name={icon} /><span>{label}</span>
    </button>
  )

  return (<>
    {/* ponytail: one shared gradient for every active tab icon; userSpaceOnUse so flat strokes (a bbox with no height) still paint */}
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <linearGradient id="tabGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0" style={{ stopColor: 'var(--acc)' }} /><stop offset="1" style={{ stopColor: 'var(--acc-2)' }} />
      </linearGradient>
    </svg>
    {fab && <button id="startfab" className={S.active ? 'rec' : ''} onClick={startWorkout} aria-label={S.active ? t('Resume') : t('Start')}>
      <Icon name={S.active ? 'play' : 'dumbbell'} />
    </button>}
    <nav id="tabbar">
      <img className="dock-logo" src={import.meta.env.BASE_URL + 'icon-512.png'} alt="" />
      <Tab k="home" icon="house" to="/home" label={t('Home')} />
      <Tab k="plan" icon="calendar" to="/plan" label={t('My Plan')} />
      <Tab k="stats" icon="chart" to="/stats" label={t('My Stats')} />
      <Tab k="nutrition" icon="apple" to="/nutrition" label={t('My Meals')} />
      <Tab k="library" icon="list" to="/library" label={t('Exercises')} />
    </nav>
  </>)
}

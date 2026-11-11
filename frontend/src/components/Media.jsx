import { useState } from 'react'
import { imgSrc, gifSrc } from '../lib/exercises.js'
import { useMediaSrc } from '../lib/media-cache.js'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import Icon from './Icon.jsx'

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// Custom exercises have no media — the animation stays blank by design (issue #11).
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12).
export default function Media({ ex, id, compact, minimizable }) {
  const [playing, setPlaying] = useState(true)
  const src = useMediaSrc(ex.gif ? (playing ? gifSrc(ex) : imgSrc(ex)) : '')
  const [failed, setFailed] = useState(null)   // the src that failed (offline, never saved): say so, not a broken-image icon
  const broken = !!src && failed === src
  const gifSize = useStore(s => s.S.gifSize)
  const update = useStore(s => s.update)
  if (!ex.gif) return null
  const mini = minimizable && gifSize === 'mini'
  const toggleSize = e => { e.stopPropagation(); update(s => { s.gifSize = mini ? 'full' : 'mini' }) }
  return (
    <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id} onClick={() => setPlaying(p => !p)}>
      {broken
        ? <div className="exmedia-off"><Icon name="dumbbell" /><span>{t('The animation shows once you’re online. Tap ⓘ for written steps.')}</span></div>
        : src ? <img decoding="async" src={src} alt={ex.n} onError={() => setFailed(src)} /> : <div className="exmedia-off" aria-hidden="true" />}
      {minimizable && (
        <button className="giftoggle" onClick={toggleSize}>
          <Icon name={mini ? 'expand' : 'minimize'} />{mini ? t('Expand') : t('Minimize')}
        </button>
      )}
      {!mini && (
        <span className="gifhint">
          <Icon name={playing ? 'pause' : 'play'} />{playing ? t('tap to pause') : t('tap to play')}
        </span>
      )}
    </div>
  )
}

export function Thumb({ ex }) {
  const src = useMediaSrc(ex.img ? imgSrc(ex) : '')
  const [failed, setFailed] = useState(null)
  if (!ex.img || !src || failed === src) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return <img className="thumb" loading="lazy" decoding="async" src={src} alt="" onError={() => setFailed(src)} />
}

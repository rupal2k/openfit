import { Component } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'
import { Button } from './ui.jsx'

/**
 * Last line of defence: one bad render used to blank the whole app, with no way back —
 * a workout referencing an exercise the build doesn't know would white-screen and, since
 * the running workout is persisted, do it again on every reload.
 *
 * Sits inside #app so the tab bar stays usable; the shell keys this subtree on the route,
 * so switching tabs re-mounts it and clears the error by itself.
 */
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false, err: null } }
  static getDerivedStateFromError(err) { return { failed: true, err } }
  componentDidCatch(err) { console.error('OPENFIT render error:', err) }
  // opt-in crash report: the person chooses to share it; it holds the error, never their data
  share = async () => {
    const e = this.state.err
    const text = ['OPENFIT ' + __APP_VERSION__, navigator.userAgent, 'screen: ' + location.hash, String(e && (e.stack || e.message || e)).slice(0, 4000)].join('\n')
    try {
      if (MOBILE) { const { Share } = await import('@capacitor/share'); await Share.share({ title: 'OPENFIT error report', text }) }
      else { await navigator.clipboard.writeText(text); useUI.getState().toast(t('Error details copied')) }
    } catch { /* share sheet dismissed */ }
  }

  render() {
    if (!this.state.failed) return this.props.children
    const active = useStore.getState().S.active
    return (
      <div className="narrow">
        <div className="empty" style={{ marginTop: '18vh' }}>
          <div className="ico"><Icon name="info" /></div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t('Something went wrong')}</div>
          {t('This screen could not be drawn. Your data is safe on this device.')}
        </div>
        <Button variant="primary" icon="reset" onClick={() => location.reload()}>{t('Reload OPENFIT')}</Button>
        <div style={{ height: 8 }} />
        <Button variant="tinted" icon="upload" onClick={this.share}>{t('Share error report')}</Button>
        <div className="small dim" style={{ marginTop: 6, textAlign: 'center' }}>{t('Only the error and app version, none of your data. You choose where it goes.')}</div>
        {active && <>
          <div style={{ height: 8 }} />
          <Button variant="danger" icon="trash" onClick={() => {
            useStore.getState().update(s => { s.active = null })
            location.reload()
          }}>{t('Discard the running workout')}</Button>
        </>}
      </div>
    )
  }
}

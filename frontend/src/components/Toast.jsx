import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'

export default function Toast() {
  const { toastMsg, toastUndo, toast } = useUI()
  return (
    <div id="toast" role="status" aria-live="polite" className={toastMsg ? 'show' : ''}>
      <span>{toastMsg}</span>
      {toastUndo && (
        <button
          type="button"
          onClick={() => {
            const fn = toastUndo
            toast('')
            fn()
          }}
          style={{
            marginLeft: 12, padding: '2px 10px', borderRadius: 99,
            background: 'var(--acc)', color: 'var(--on-acc)',
            fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer'
          }}
        >
          {t('Undo')}
        </button>
      )}
    </div>
  )
}

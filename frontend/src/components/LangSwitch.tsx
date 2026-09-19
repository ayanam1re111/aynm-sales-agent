import { useLang } from '../store/useLang'

/** 语言切换按钮，显示的是切过去之后的语言名 */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { toggle, t } = useLang()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch language"
      className={`inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface/70 px-3 py-1.5
                  text-hint font-medium text-ink-soft backdrop-blur transition
                  hover:border-brand/40 hover:text-brand ${className}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
      {t('lang.switch')}
    </button>
  )
}

import { SUGGESTIONS } from '../mock/charts'
import { useLang } from '../store/useLang'

const A = '/assets/sales-agent'

interface Props {
  onPick: (question: string) => void
  disabled?: boolean
}

export function EmptyState({ onPick, disabled = false }: Props) {
  const { t } = useLang()

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-8 pb-24">
      <img
        src={`${A}/node-constellation.png`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-[clamp(320px,42vw,620px)] -translate-y-1/2 select-none opacity-25"
      />

      <div className="relative flex flex-col items-center">
        <img
          src={`${A}/agent-labrador-avatar.png`}
          alt=""
          aria-hidden="true"
          className="mb-5 h-16 w-16 select-none rounded-full"
          draggable={false}
        />
        <h2 className="text-session font-semibold text-ink">{t('empty.title')}</h2>
        <p className="mt-1.5 text-ui text-ink-soft">{t('empty.subtitle')}</p>

        <div className="mt-8 grid w-full max-w-[720px] grid-cols-2 gap-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={disabled}
              onClick={() => onPick(s.query)}
              className="rounded-bubble border border-line bg-surface px-4 py-3 text-left text-ui text-ink-soft shadow-card
                         transition hover:-translate-y-0.5 hover:border-brand/30 hover:text-ink
                         disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {t(s.label)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

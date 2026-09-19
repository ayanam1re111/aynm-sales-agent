import { formatStamp } from '../lib/format'
import { useLang } from '../store/useLang'
import type { AuthUser, Role, Session } from '../types'
import { PersonIcon } from './PersonIcon'
import { RoleBadge } from './RoleBadge'

const A = '/assets/sales-agent'

const SCOPE_KEY: Record<Role, 'scope.SALES_DIRECTOR' | 'scope.SALES_MANAGER' | 'scope.SALES_REP'> =
  {
    SALES_DIRECTOR: 'scope.SALES_DIRECTOR',
    SALES_MANAGER: 'scope.SALES_MANAGER',
    SALES_REP: 'scope.SALES_REP',
  }

interface Props {
  sessions: Session[]
  activeId: string
  user: AuthUser
  onSelect: (id: string) => void
  onCreate: () => void
  onRemove: (id: string) => void
  onSignOut: () => void
}

export function Sidebar({
  sessions,
  activeId,
  user,
  onSelect,
  onCreate,
  onRemove,
  onSignOut,
}: Props) {
  const { t } = useLang()
  const scopeText = user.role === 'SALES_MANAGER' ? user.scope : t(SCOPE_KEY[user.role])

  return (
    <nav
      aria-label={t('sidebar.history')}
      className="relative flex w-sidebar shrink-0 flex-col overflow-hidden border-r border-line bg-sidebar/80"
    >
      <img
        src={`${A}/vertical-data-rain.png`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-0 h-full w-[120px] select-none object-cover opacity-15"
      />

      <div className="relative px-4 pt-6">
        <button
          type="button"
          onClick={onCreate}
          aria-label={t('sidebar.new')}
          className="flex w-full items-center justify-center gap-2 rounded-btn bg-brand-gradient py-2.5 text-ui font-medium text-white shadow-card transition hover:brightness-105"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          {t('sidebar.new')}
        </button>
      </div>

      <p className="relative px-5 pb-2 pt-6 text-hint font-medium text-ink-soft">{t('sidebar.history')}</p>

      <div className="relative flex-1 overflow-y-auto px-2.5 pb-4">
        {sessions.length === 0 ? (
          <p className="px-3 py-6 text-center text-hint text-ink-mute">{t('sidebar.empty')}</p>
        ) : (
          sessions.map((s) => {
            const isActive = s.id === activeId
            return (
              <div
                key={s.id}
                className={`group mb-1 flex items-center gap-2 rounded-btn px-3 py-2.5 transition ${
                  isActive ? 'bg-white shadow-card' : 'hover:bg-white/60'
                }`}
              >
                <button type="button" onClick={() => onSelect(s.id)} title={s.title} className="min-w-0 flex-1 text-left">
                  <span
                    className={`block truncate text-ui ${isActive ? 'font-medium text-ink' : 'text-ink-soft'}`}
                  >
                    {s.title}
                  </span>
                  <time className="mt-0.5 block text-meta text-ink-mute">{formatStamp(s.createdAt)}</time>
                </button>

                <button
                  type="button"
                  onClick={() => onRemove(s.id)}
                  aria-label={`Delete: ${s.title}`}
                  className="shrink-0 rounded p-1 text-ink-mute opacity-0 transition hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="relative border-t border-line px-4 py-4">
        <div className="flex items-center gap-3">
          <PersonIcon role={user.role} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-ui font-medium text-ink">{user.username}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <RoleBadge role={user.role} />
              <span className="text-meta text-ink-mute">{scopeText}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            aria-label={t('sidebar.signOut')}
            title={t('sidebar.signOut')}
            className="shrink-0 rounded p-1.5 text-ink-mute transition hover:text-ink-soft"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}

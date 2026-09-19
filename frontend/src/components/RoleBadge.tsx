import { useLang } from '../store/useLang'
import type { Role } from '../types'

const TONE: Record<Role, string> = {
  SALES_DIRECTOR: 'bg-brand/10 text-brand border-brand/20',
  SALES_MANAGER: 'bg-info/10 text-info border-info/20',
  SALES_REP: 'bg-ink-mute/15 text-ink-soft border-ink-mute/25',
}

const KEY: Record<Role, 'role.SALES_DIRECTOR' | 'role.SALES_MANAGER' | 'role.SALES_REP'> = {
  SALES_DIRECTOR: 'role.SALES_DIRECTOR',
  SALES_MANAGER: 'role.SALES_MANAGER',
  SALES_REP: 'role.SALES_REP',
}

export function RoleBadge({ role }: { role: Role }) {
  const { t } = useLang()

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-meta font-medium ${TONE[role]}`}
    >
      {t(KEY[role])}
    </span>
  )
}

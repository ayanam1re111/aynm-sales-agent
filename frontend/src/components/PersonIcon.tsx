import type { Role } from '../types'

const TONE: Record<Role, string> = {
  SALES_DIRECTOR: 'from-brand to-brand-deep',
  SALES_MANAGER: 'from-info to-brand-cyan',
  SALES_REP: 'from-ink-mute to-ink-soft',
}

/** 账号头像用人物剪影，不用吉祥物 */
export function PersonIcon({ role, size = 28 }: { role: Role; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${TONE[role]}`}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8.5" r="4" fill="white" fillOpacity="0.95" />
        <path d="M4.5 21c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5" fill="white" fillOpacity="0.95" />
      </svg>
    </span>
  )
}

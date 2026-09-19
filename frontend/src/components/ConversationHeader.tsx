import { useLang } from '../store/useLang'
import type { AuthUser, Role } from '../types'
import { RoleBadge } from './RoleBadge'

const A = '/assets/sales-agent'

const SCOPE_KEY: Record<Role, 'scope.SALES_DIRECTOR' | 'scope.SALES_MANAGER' | 'scope.SALES_REP'> =
  {
    SALES_DIRECTOR: 'scope.SALES_DIRECTOR',
    SALES_MANAGER: 'scope.SALES_MANAGER',
    SALES_REP: 'scope.SALES_REP',
  }

interface Props {
  title: string
  user: AuthUser
}

/** 顶栏 78px：左侧当前会话标题，右侧数据范围与角色徽章 */
export function ConversationHeader({ title, user }: Props) {
  const { t } = useLang()
  const scopeText = user.role === 'SALES_MANAGER' ? user.scope : t(SCOPE_KEY[user.role])

  return (
    <header className="relative flex h-[78px] shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-line px-8">
      <img
        src={`${A}/chat-header-data-flow.png`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-full w-[68%] select-none object-cover opacity-[0.38]"
      />

      <h2 className="relative truncate text-session font-semibold text-ink">{title}</h2>

      <div className="relative flex shrink-0 items-center gap-2.5">
        <span className="text-hint text-ink-soft">{scopeText}</span>
        <RoleBadge role={user.role} />
      </div>
    </header>
  )
}

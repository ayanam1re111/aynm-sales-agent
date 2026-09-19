import { useAutoScroll } from '../hooks/useAutoScroll'
import { useChat } from '../store/useChat'
import { useLang } from '../store/useLang'
import type { AuthUser } from '../types'
import { Composer } from './Composer'
import { ConversationHeader } from './ConversationHeader'
import { EmptyState } from './EmptyState'
import { FloatingAgent } from './FloatingAgent'
import { MessageList } from './MessageList'
import { Sidebar } from './Sidebar'

interface Props {
  user: AuthUser
  onSignOut: () => void
}

export function AppShell({ user, onSignOut }: Props) {
  const { t } = useLang()
  const chat = useChat(user, onSignOut, t)
  const messages = chat.active?.messages ?? []
  const scrollRef = useAutoScroll<HTMLDivElement>(messages)

  return (
    <div className="flex h-full bg-bg">
      <Sidebar
        sessions={chat.sessions}
        activeId={chat.activeId}
        user={user}
        onSelect={chat.setActiveId}
        onCreate={chat.createSession}
        onRemove={chat.removeSession}
        onSignOut={onSignOut}
      />

      {/* relative 让悬浮小狗相对会话画布定位，不随消息滚动 */}
      <main className="relative flex min-w-0 flex-1 flex-col">
        <ConversationHeader title={chat.active?.title ?? t('sidebar.new')} user={user} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pt-6">
          {messages.length === 0 ? (
            <EmptyState onPick={chat.send} disabled={chat.busy} />
          ) : (
            <MessageList messages={messages} />
          )}
        </div>

        <Composer onSend={chat.send} onStop={chat.stop} busy={chat.busy} />

        <FloatingAgent active={chat.busy} />
      </main>
    </div>
  )
}

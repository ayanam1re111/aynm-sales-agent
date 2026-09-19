import type { Message } from '../types'
import { AgentMessage } from './AgentMessage'
import { UserMessage } from './UserMessage'

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="mx-auto w-full max-w-[960px] space-y-6 pb-8">
      {messages.map((m) => (
        <div key={m.id} className="animate-fade-in">
          {m.role === 'user' ? <UserMessage message={m} /> : <AgentMessage message={m} />}
        </div>
      ))}
    </div>
  )
}

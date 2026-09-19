import { formatStamp } from '../lib/format'
import type { Message } from '../types'

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="max-w-[560px] rounded-bubble bg-brand-gradient px-4 py-3 text-body text-white shadow-card">
        <p className="agent-answer">{message.content}</p>
      </div>
      <time className="text-meta text-ink-mute">{formatStamp(message.createdAt)}</time>
    </div>
  )
}

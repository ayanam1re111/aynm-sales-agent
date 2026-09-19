import { useCallback, useEffect, useRef, useState } from 'react'
import { chatStream, deleteSession as apiDeleteSession } from '../api/chat'
import { extractSegments, inlineCharts } from '../lib/chart'
import { titleFrom, uuid } from '../lib/format'
import { loadSessions, saveSessions } from '../lib/storage'
import type { MessageKey } from '../lib/i18n'
import type { AuthUser, ChartOption, Message, Session } from '../types'

const MAX_MESSAGE_LENGTH = 2000

type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string

function newSession(title: string): Session {
  return { id: uuid(), title, createdAt: Date.now(), messages: [] }
}

export function useChat(user: AuthUser, onUnauthorized: () => void, t: TFn) {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const stored = loadSessions()
    return stored.length > 0 ? stored : [newSession(t('sidebar.new'))]
  })
  const [activeId, setActiveId] = useState(() => sessions[0]?.id ?? '')
  const [busy, setBusy] = useState(false)

  // 流式请求的中断句柄，供「停止」按钮使用
  const abortRef = useRef<AbortController | null>(null)

  // 持久化时丢掉 segments（图表 option 体积大），读取时再重新推导
  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0]

  const patchMessage = useCallback((sessionId: string, messageId: string, patch: Partial<Message>) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id !== sessionId
          ? s
          : { ...s, messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)) },
      ),
    )
  }, [])

  const createSession = useCallback(() => {
    const s = newSession(t('sidebar.new'))
    setSessions((prev) => [s, ...prev])
    setActiveId(s.id)
  }, [t])

  const removeSession = useCallback(
    (id: string) => {
      // 后端失败不阻塞本地删除：记忆残留只占存储，不该让界面卡住
      void apiDeleteSession(user.token, id).catch(() => {})
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id)
        const list = next.length > 0 ? next : [newSession(t('sidebar.new'))]
        setActiveId((cur) => (cur === id ? list[0].id : cur))
        return list
      })
    },
    [user.token, t],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
  }, [])

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || busy || !active) return
      // 前端先拦一道，否则超长消息后端返的是 500 而不是 400
      if (content.length > MAX_MESSAGE_LENGTH) return

      const sessionId = active.id
      const userMsg: Message = {
        id: uuid(),
        role: 'user',
        content,
        segments: [{ type: 'text', content }],
        createdAt: Date.now(),
      }
      const replyMsg: Message = {
        id: uuid(),
        role: 'assistant',
        content: '',
        segments: [],
        streaming: true,
        createdAt: Date.now(),
      }

      setSessions((prev) =>
        prev.map((s) =>
          s.id !== sessionId
            ? s
            : {
                ...s,
                title: s.messages.length === 0 ? titleFrom(content) : s.title,
                messages: [...s.messages, userMsg, replyMsg],
              },
        ),
      )
      setBusy(true)

      const controller = new AbortController()
      abortRef.current = controller
      const startedAt = performance.now()
      let buffer = ''
      // 图表由后端经 chart 事件提前下发（工具一执行完就发），模型正文里只有占位符，
      // 所以这里攒着，每次重算 segments 时按顺序填回去
      const charts: ChartOption[] = []

      // 流式期间也做分段解析，但用 streaming 标记：还没传完的图表 JSON
      // 只会显示占位块，不会把半截 JSON 当文本吐出来
      const flush = (streaming: boolean) => {
        const filled = inlineCharts(buffer, charts)
        patchMessage(sessionId, replyMsg.id, {
          content: buffer,
          charts: [...charts],
          segments: extractSegments(filled, streaming),
        })
      }

      const finish = (patch: Partial<Message>) => {
        const filled = inlineCharts(buffer, charts)
        patchMessage(sessionId, replyMsg.id, {
          content: buffer,
          charts: [...charts],
          segments: extractSegments(filled, false),
          streaming: false,
          ...patch,
        })
        setBusy(false)
        abortRef.current = null
      }

      try {
        await chatStream(
          user.token,
          sessionId,
          content,
          {
            onToken: (token) => {
              buffer += token
              flush(true)
            },
            onChart: (option) => {
              charts.push(option)
              flush(true)
            },
            // 流式接口不返回 durationMs，前端自己计时
            onDone: () => finish({ durationMs: Math.round(performance.now() - startedAt) }),
            // 后端出错时发 event: error 后正常关闭，HTTP 状态仍是 200，
            // 所以必须显式标记失败，不能靠状态码
            onError: (message) => finish({ error: message }),
          },
          controller.signal,
        )
      } catch (e) {
        if ((e as Error).name === 'AbortError') {
          finish({ error: t('msg.stopped') })
          return
        }
        const err = e as Error & { status?: number }
        if (err.status === 401) onUnauthorized()
        // 状态码能识别时用本地文案；其余情况透传后端返回的纯文本原因
        const message =
          err.status === 0
            ? t('err.network')
            : err.status === 401
              ? t('err.expired')
              : err.message || t('err.request')
        finish({ error: message })
      }
    },
    [active, busy, onUnauthorized, patchMessage, t, user.token],
  )

  return {
    sessions,
    active,
    activeId: active?.id ?? '',
    setActiveId,
    busy,
    send,
    stop,
    createSession,
    removeSession,
  }
}

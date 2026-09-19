import { consumeSSE } from '../lib/sse'
import { resolveScope } from '../mock/users'
import type { AuthUser, ChartOption, Role } from '../types'
import { request, requestJson } from './client'

interface LoginResponse {
  token: string
  username: string
  role: Role
}

export async function login(repId: number, password: string): Promise<AuthUser> {
  const data = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { repId, password },
  })
  // 后端不回传 repId 与大区，前端自行补全展示用的数据范围
  return {
    token: data.token,
    username: data.username,
    role: data.role,
    repId,
    scope: resolveScope(repId, data.role),
  }
}

export async function logout(token: string): Promise<void> {
  await request('/auth/logout', { method: 'POST', token })
}

/** 清除后端保存的对话记忆。后端不做归属校验，任何登录用户都能删任意 sessionId */
export async function deleteSession(token: string, sessionId: string): Promise<void> {
  await request(`/agent/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE', token })
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onChart: (option: ChartOption) => void
  onDone: () => void
  onError: (message: string) => void
}

/**
 * 流式对话。不能用 EventSource（接口是 POST + 自定义 header），只能用 fetch 手动解 SSE 帧。
 * 也不设 `Accept: text/event-stream`，否则后端的纯文本错误响应会被当成「空回复」吞掉。
 */
export async function chatStream(
  token: string,
  sessionId: string,
  message: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await request('/agent/chat/stream', {
    method: 'POST',
    token,
    signal,
    body: { sessionId, message },
  })

  if (!res.body) {
    callbacks.onError('响应体为空，无法读取流式内容')
    return
  }

  await consumeSSE(res.body, {
    onToken: callbacks.onToken,
    onDone: callbacks.onDone,
    onError: callbacks.onError,
    onChart: (json) => {
      // 单张图解析失败不该毁掉整条回复：跳过这张，正文里的占位符会退化成空
      try {
        callbacks.onChart(JSON.parse(json) as ChartOption)
      } catch {
        /* 丢弃这一张 */
      }
    },
  })
}

import type { AuthUser, Session } from '../types'

// 带版本号：以后结构变了可以直接丢弃旧数据，而不是在 JSON.parse 处炸掉、静默清空历史
const AUTH_KEY = 'aynm.auth.v1'
const SESSIONS_KEY = 'aynm.sessions.v1'

export function loadAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function saveAuth(user: AuthUser | null): void {
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user))
  else localStorage.removeItem(AUTH_KEY)
}

/**
 * 会话与消息持久化。sessionId 必须一起存，否则刷新后接不上后端记忆。
 * 只存 content 原文，segments 读取时重新推导，避免把图表 option 写进 localStorage 撑爆配额。
 */
export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Session[]
    return parsed.map((s) => ({
      ...s,
      // 清掉刷新前残留的 streaming 标记，否则气泡会一直停在加载态
      messages: s.messages.map((m) => ({ ...m, segments: [], streaming: false })),
    }))
  } catch {
    return []
  }
}

export function saveSessions(sessions: Session[]): void {
  try {
    localStorage.setItem(
      SESSIONS_KEY,
      JSON.stringify(
        sessions.map((s) => ({
          ...s,
          messages: s.messages.map((m) => ({ ...m, segments: [] })),
        })),
      ),
    )
  } catch {
    // 超出配额时静默降级：内存里仍可用，只是刷新后丢失
  }
}

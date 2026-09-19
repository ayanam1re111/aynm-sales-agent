/** 耗时：小于 1 秒显示毫秒，否则显示一位小数的秒 */
export function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

/** 会话内的时间戳，如 09-30 10:24 */
export function formatStamp(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 会话标题取首条提问，超长截断 */
export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 18 ? `${clean.slice(0, 18)}…` : clean || '新对话'
}

/**
 * crypto.randomUUID 需要安全上下文（https 或 localhost）。
 * 用局域网 IP 演示时它是 undefined，会导致新建会话直接抛错，所以留个降级实现。
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

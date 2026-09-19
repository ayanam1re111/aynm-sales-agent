/** 后端错误响应是纯文本而非 JSON（401 / 400 / 500 都是），所以统一先按文本读，不能无脑 .json()。 */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null

/**
 * 注册全局 401 回调。
 * Sa-Token 用的是内存存储（项目未引入 sa-token-redis），后端一重启所有 token 失效，
 * 任何请求都可能突然 401。必须统一处理，否则用户会卡在一个永远失败的页面上。
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

/** 多个请求同时 401 时只弹一次，避免连续踢回登录页 */
let bouncing = false

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string | null
  signal?: AbortSignal
}

export async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, token, signal } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  // Sa-Token 的 token-name 配的就是 Authorization，直接放原始 token
  if (token) headers['Authorization'] = token

  let res: Response
  try {
    // 走 Vite 代理（/api 前缀），浏览器视作同源，绕开后端缺失的 CORS 配置
    res = await fetch(`/api${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError('无法连接后端服务，请确认服务已启动', 0)
  }

  if (res.status === 401) {
    if (!bouncing) {
      bouncing = true
      // 下一帧再放开，让当前这一批并发请求共用同一次跳转
      setTimeout(() => {
        bouncing = false
      }, 500)
      onUnauthorized?.()
    }
    throw new ApiError('登录已失效，请重新登录', 401)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(text || `请求失败（${res.status}）`, res.status)
  }

  return res
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await request(path, options)
  return (await res.json()) as T
}

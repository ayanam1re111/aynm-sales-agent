export interface SSEHandlers {
  onToken: (token: string) => void
  /** 图表 option 的原始 JSON，由后端在图表工具执行完时下发，不经过模型转述 */
  onChart: (json: string) => void
  onDone: () => void
  onError: (message: string) => void
}

interface SSEFrame {
  event: string
  data: string
}

const FRAME_SEP = /\r?\n\r?\n/

/**
 * 解析后端的 SSE 流。三个坑：帧会被网络分片切在中间，尾部要留在 buffer 等下一片；
 * token 内的换行会被 Spring 拆成多个 data: 行，需用 \n 拼回；
 * 失败只体现在 error 事件上，HTTP 状态码始终是 200。
 */
export async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  handlers: SSEHandlers,
): Promise<void> {
  const reader = body.getReader()
  // 解码器全程复用且带 stream:true，中文跨分片时才不会解出乱码
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let match: RegExpExecArray | null
      while ((match = FRAME_SEP.exec(buffer)) !== null) {
        const rawFrame = buffer.slice(0, match.index)
        buffer = buffer.slice(match.index + match[0].length)

        const frame = parseFrame(rawFrame)
        if (!frame) continue

        if (frame.event === 'token') {
          handlers.onToken(frame.data)
        } else if (frame.event === 'chart') {
          handlers.onChart(frame.data)
        } else if (frame.event === 'done') {
          finished = true
          handlers.onDone()
          return
        } else if (frame.event === 'error') {
          finished = true
          handlers.onError(frame.data || '服务暂时不可用，请稍后重试')
          return
        }
      }
    }

    // 后端两条终止路径都会显式发终止事件，静默结束按失败处理
    if (!finished) {
      handlers.onError('连接已中断，请重试')
    }
  } finally {
    // releaseLock 只是放开锁，不关连接；提前 return 时流会一直挂着
    await reader.cancel().catch(() => {})
  }
}

function parseFrame(raw: string): SSEFrame | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of raw.split(/\r?\n/)) {
    // 空行与冒号开头的注释行（心跳）跳过
    if (!line || line.startsWith(':')) continue

    const colon = line.indexOf(':')
    if (colon === -1) continue

    const field = line.slice(0, colon)
    // 不要按 SSE 规范去掉冒号后的空格：Spring 写的是 `data:<值>`，冒号后本就没有分隔空格，
    // 一旦照规范吃一个，吃掉的其实是 token 自己的前导空格（token 为 " world" → "world"），
    // 英文单词会全部粘连。中文 token 不带前导空格，所以只有英文露馅。
    const value = line.slice(colon + 1)

    if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }

  if (dataLines.length === 0) return null
  return { event, data: dataLines.join('\n') }
}

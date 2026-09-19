import type { Lang } from './i18n'
import type { ChartOption, Segment } from '../types'

const CHART_PREFIX = 'CHART_JSON:'

/** 图表里来自后端 / 数据库的中文标签：四个大区、四个品类、几个固定轴名。只在展示层替换，不改变工具入参。 */
const CHART_LABELS_EN: Record<string, string> = {
  华东区: 'East China',
  华南区: 'South China',
  华北区: 'North China',
  西南区: 'Southwest China',
  数码产品: 'Digital Products',
  家用电器: 'Home Appliances',
  服装配饰: 'Fashion & Accessories',
  其他: 'Others',
  销售额: 'Sales',
  '销售额（元）': 'Sales (CNY)',
}

/** 命中术语表才替换 —— 销售员姓名这类专有名词照原样保留 */
function translateLabel(value: unknown): unknown {
  return typeof value === 'string' ? (CHART_LABELS_EN[value] ?? value) : value
}

/**
 * 英文界面下把图表 option 里的中文标签换成英文。
 * 中文界面直接原样返回，不做任何遍历。
 */
export function localizeChart(option: ChartOption, lang: Lang): ChartOption {
  if (lang === 'zh') return option

  const out = structuredClone(option)

  const seriesList = Array.isArray(out.series) ? out.series : out.series ? [out.series] : []
  for (const s of seriesList) {
    if (!s || typeof s !== 'object') continue
    const item = s as Record<string, unknown>
    if (typeof item.name === 'string') item.name = translateLabel(item.name)
    if (Array.isArray(item.data)) {
      item.data = item.data.map((d) => {
        // 饼图的数据项是 {name, value}，折线 / 柱状是裸数字
        if (d && typeof d === 'object' && 'name' in d) {
          const entry = { ...(d as Record<string, unknown>) }
          entry.name = translateLabel(entry.name)
          return entry
        }
        return d
      })
    }
  }

  // xAxis / yAxis 可能是对象也可能是数组；轴名和刻度都要过一遍
  const fixAxis = (axis: unknown) => {
    for (const a of Array.isArray(axis) ? axis : [axis]) {
      if (!a || typeof a !== 'object') continue
      const node = a as Record<string, unknown>
      if (Array.isArray(node.data)) node.data = node.data.map(translateLabel)
      if (typeof node.name === 'string') node.name = translateLabel(node.name)
    }
    return axis
  }
  if (out.xAxis) out.xAxis = fixAxis(out.xAxis)
  if (out.yAxis) out.yAxis = fixAxis(out.yAxis)

  if (out.title && typeof out.title === 'object') {
    const title = out.title as Record<string, unknown>
    if (typeof title.text === 'string') title.text = translateLabel(title.text)
  }

  return out
}

/**
 * 把回复切成有序的 text / chart 片段。
 * 内容是模型转述的，前缀后可能多空格、JSON 外可能裹文字，所以按括号匹配提取，
 * 而不是简单 split。@param streaming 为 true 时不渲染半截 JSON，只给占位段。
 */
export function extractSegments(raw: string, streaming = false): Segment[] {
  const segments: Segment[] = []
  let cursor = 0

  for (;;) {
    const prefixAt = raw.indexOf(CHART_PREFIX, cursor)
    if (prefixAt === -1) break

    // 前缀后只允许空白。新协议下工具返回给模型的是一句以 CHART_JSON: 开头的提示语，
    // 模型偶尔会把它原样抄进正文，这里识别出来直接丢掉标记，不把提示语当正文渲染
    let braceAt = prefixAt + CHART_PREFIX.length
    while (braceAt < raw.length && /\s/.test(raw[braceAt])) braceAt++

    if (raw[braceAt] !== '{') {
      const before = raw.slice(cursor, prefixAt).trim()
      if (before) segments.push({ type: 'text', content: before })
      cursor = prefixAt + CHART_PREFIX.length
      continue
    }

    const end = matchBrace(raw, braceAt)

    if (end === -1) {
      const before = raw.slice(cursor, prefixAt).trim()
      if (before) segments.push({ type: 'text', content: before })
      segments.push(
        streaming ? { type: 'chart-loading' } : { type: 'text', content: raw.slice(prefixAt).trim() },
      )
      return segments
    }

    const json = raw.slice(braceAt, end + 1)
    let option: ChartOption
    try {
      option = JSON.parse(json) as ChartOption
    } catch {
      // 解析失败就跳过这处前缀继续往后找，不让一段坏 JSON 毁掉整条消息
      cursor = braceAt + 1
      continue
    }

    const before = raw.slice(cursor, prefixAt).trim()
    if (before) segments.push({ type: 'text', content: before })
    segments.push({ type: 'chart', option })
    cursor = end + 1
  }

  const tail = raw.slice(cursor).trim()
  if (tail) segments.push({ type: 'text', content: tail })

  return segments
}

const CHART_PLACEHOLDER = /\[\[\s*CHART\s*\]\]/gi

/**
 * 把模型输出的 [[CHART]] 占位符按顺序换成后端下发的图表。
 * 图比占位符多时补到末尾，占位符比图多时留空；只做派生，不修改原始 content。
 */
export function inlineCharts(content: string, charts: ChartOption[]): string {
  let used = 0
  const filled = content.replace(CHART_PLACEHOLDER, () =>
    used < charts.length ? `CHART_JSON:${JSON.stringify(charts[used++])}` : '',
  )

  if (used >= charts.length) return filled
  const rest = charts
    .slice(used)
    .map((c) => `CHART_JSON:${JSON.stringify(c)}`)
    .join('\n')
  return `${filled}\n${rest}`
}

/** 返回与 raw[openAt] 处 { 配对的 } 下标；必须跳过字符串字面量内的括号与转义，否则会切出半个 JSON */
function matchBrace(raw: string, openAt: number): number {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = openAt; i < raw.length; i++) {
    const ch = raw[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (inString) {
      if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }

    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }

  return -1
}

/**
 * 至少要有一个带数据的 series 才值得渲染，否则 ECharts 只会画出标题和一个空白画布。
 * 模型转述 JSON 时可能把 series 的方括号吞掉，所以对象形态也要认。
 */
export function isRenderableOption(option: ChartOption): boolean {
  const raw = option.series
  const series = Array.isArray(raw) ? raw : raw ? [raw] : []
  return series.some((s) => {
    const data = (s as { data?: unknown } | null)?.data
    return Array.isArray(data) && data.length > 0
  })
}

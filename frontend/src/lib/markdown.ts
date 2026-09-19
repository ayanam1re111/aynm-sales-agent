/**
 * 极简 markdown 解析器，只实现模型实际会用的三种语法：加粗、表格、无序列表。
 * 不支持的语法按普通段落输出，不会丢内容。
 */

export interface Span {
  text: string
  bold: boolean
}

export type Block =
  | { type: 'p'; spans: Span[] }
  | { type: 'ul'; items: Span[][] }
  | { type: 'table'; header: Span[][] | null; rows: Span[][][] }

const TABLE_ROW = /^\s*\|.*\|\s*$/
const TABLE_SEP = /^\s*\|[\s:|-]+\|\s*$/
const LIST_ITEM = /^\s*[-*]\s+(.*)$/

/** 表格分隔行（|---|---|）必须含至少一个短横，否则会被误认成数据行 */
function isSeparator(line: string): boolean {
  return TABLE_SEP.test(line) && line.includes('-')
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((c) => c.trim())
}

/** 把 `**加粗**` 切成带标记的片段；未闭合的星号原样保留 */
export function parseInline(text: string): Span[] {
  const spans: Span[] = []
  let rest = text

  for (;;) {
    const open = rest.indexOf('**')
    if (open === -1) break

    const close = rest.indexOf('**', open + 2)
    // 找不到闭合、或内容为空（`****`）就当普通字符，避免死循环
    if (close === -1 || close === open + 2) {
      if (close === open + 2) {
        spans.push({ text: rest.slice(0, open), bold: false })
        rest = rest.slice(close + 2)
        continue
      }
      break
    }

    spans.push({ text: rest.slice(0, open), bold: false })
    spans.push({ text: rest.slice(open + 2, close), bold: true })
    rest = rest.slice(close + 2)
  }

  if (rest) spans.push({ text: rest, bold: false })
  return spans.filter((s) => s.text !== '')
}

export function parseBlocks(source: string): Block[] {
  const lines = source.split('\n')
  const blocks: Block[] = []
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({ type: 'p', spans: parseInline(paragraph.join('\n')) })
    paragraph = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (TABLE_ROW.test(line)) {
      flushParagraph()
      const raw: string[] = []
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        raw.push(lines[i])
        i++
      }
      i--

      // 第二行是分隔行才算有表头，否则整块当无表头的数据行
      const hasHeader = raw.length >= 2 && isSeparator(raw[1])
      const body = hasHeader ? raw.slice(2) : raw
      blocks.push({
        type: 'table',
        header: hasHeader ? splitRow(raw[0]).map(parseInline) : null,
        rows: body.map((row) => splitRow(row).map(parseInline)),
      })
      continue
    }

    const listMatch = LIST_ITEM.exec(line)
    if (listMatch) {
      flushParagraph()
      const items: Span[][] = []
      while (i < lines.length) {
        const m = LIST_ITEM.exec(lines[i])
        if (!m) break
        items.push(parseInline(m[1]))
        i++
      }
      i--
      blocks.push({ type: 'ul', items })
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  return blocks
}

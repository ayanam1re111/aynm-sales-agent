import { parseBlocks, type Span } from '../lib/markdown'

/** 加粗片段渲染成 <strong>，其余原样；返回值放进 <p>/<li>/<td> 里 */
function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((s, i) =>
        s.bold ? (
          // 只加粗、不指定颜色：颜色靠继承，这样权限拒绝的警示色能一路透下来
          <strong key={i} className="font-semibold">
            {s.text}
          </strong>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
}

/** 渲染模型输出的 markdown。段落用 .agent-answer，表格单独走一套样式（pre-wrap 会显出单元格换行）。 */
export function MarkdownText({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul key={i} className="agent-answer list-disc space-y-0.5 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Spans spans={item} />
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'table') {
          return (
            <div key={i} className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-ui tabular-nums">
                {block.header && (
                  <thead>
                    <tr>
                      {block.header.map((cell, j) => (
                        <th
                          key={j}
                          className="border border-line bg-bg px-3 py-1.5 text-left font-semibold text-ink"
                        >
                          <Spans spans={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, j) => (
                    <tr key={j}>
                      {row.map((cell, k) => (
                        <td key={k} className="border border-line px-3 py-1.5 text-ink-soft">
                          <Spans spans={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        return (
          <p key={i} className="agent-answer">
            <Spans spans={block.spans} />
          </p>
        )
      })}
    </>
  )
}

import { useMemo } from 'react'
import { extractSegments, inlineCharts, isRenderableOption } from '../lib/chart'
import { formatDuration } from '../lib/format'
import { useLang } from '../store/useLang'
import type { Message } from '../types'
import { ChartCard } from './ChartCard'
import { MarkdownText } from './MarkdownText'

const A = '/assets/sales-agent'

/** 权限拒绝类文案后端当正常回答返回，给个柔和的提示色区分开 */
function isDenied(text: string): boolean {
  return /没有权限|无权限|无法查询该用户|用户未登录/.test(text)
}

export function AgentMessage({ message }: { message: Message }) {
  const { t } = useLang()
  // 片段一律从原文推导，不读存储里的 segments —— 历史消息恢复时那份是空的。
  // 先把后端下发的图表填进 [[CHART]] 占位符，再按 CHART_JSON 切段；
  // 历史消息仍是旧的内联格式，那时 charts 为空，inlineCharts 原样放行。
  const segments = useMemo(
    () => extractSegments(inlineCharts(message.content, message.charts ?? []), message.streaming),
    [message.content, message.charts, message.streaming],
  )
  const showThinking = message.streaming && segments.length === 0

  return (
    <div className="flex gap-3">
      <img
        src={`${A}/agent-labrador-avatar.png`}
        alt=""
        aria-hidden="true"
        className="mt-0.5 h-9 w-9 shrink-0 select-none rounded-full"
        draggable={false}
      />

      <div className="min-w-0 max-w-[860px] flex-1">
        <div className="relative rounded-bubble border border-line bg-surface/90 px-4 py-3 shadow-card backdrop-blur-sm">
          {showThinking ? (
            <div className="flex items-center gap-2.5 py-1 text-ui text-ink-soft">
              <img
                src={`${A}/ai-pulse-rings.png`}
                alt=""
                aria-hidden="true"
                className="h-6 w-6 select-none motion-safe:animate-dot-pulse"
              />
              {t('msg.thinking')}
            </div>
          ) : (
            <div className="space-y-1">
              {segments.map((seg, i) => {
                if (seg.type === 'chart') {
                  // 解析成功但画不出东西（例如 series 缺数据）时给出明确占位，
                  // 而不是渲染一张只有标题的空白卡片
                  return (
                    <ChartCard
                      key={i}
                      option={seg.option}
                      state={isRenderableOption(seg.option) ? 'ready' : 'empty'}
                    />
                  )
                }
                if (seg.type === 'chart-loading') return <ChartCard key={i} state="loading" />
                const denied = isDenied(seg.content)
                return (
                  <div key={i} className={denied ? '[&_p.agent-answer]:text-warning' : undefined}>
                    <MarkdownText content={seg.content} />
                    {/* 流式生成中：正文末尾光标 */}
                    {message.streaming && i === segments.length - 1 && (
                      <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-brand animate-dot-pulse" />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {message.error && (
            <p className="mt-2 rounded-btn bg-danger/10 px-3 py-2 text-hint text-danger">{message.error}</p>
          )}
        </div>

        {!message.streaming && message.durationMs !== undefined && (
          <p className="mt-1.5 pl-1 text-meta text-ink-mute tabular-nums">
            {t('msg.duration', { v: formatDuration(message.durationMs) })}
          </p>
        )}
      </div>
    </div>
  )
}

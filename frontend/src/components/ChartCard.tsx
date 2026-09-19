import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useEffect, useRef } from 'react'
import { localizeChart } from '../lib/chart'
import { useLang } from '../store/useLang'
import type { ChartOption } from '../types'

// 后端只会用到折线、柱状、饼图三种，按需注册即可。
// 全量 import 'echarts' 会把所有图表类型都打进包里，体积翻好几倍。
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
])

const LINE_COLOR = '#5B68F6'
const BAR_COLORS = ['#5271FF', '#815AF6', '#36B98A', '#F2A43B', '#36B9D7', '#EB5795']
const PIE_COLORS = ['#5271FF', '#805AD5', '#3ABF8A', '#F5A23A', '#36B9D7', '#EB5795']

/**
 * 后端在工具里把折线钉死成 #5470c6、柱状钉死成 #91cc75（ChartGeneratorTool 内），
 * 是 ECharts 的老默认配色，跟本项目的紫蓝主题冲突。
 * 这里剥离 series 上的颜色，让它们回落到设计稿的调色板 —— 只换配色，不动数据。
 */
function applyTheme(option: ChartOption): ChartOption {
  const themed = structuredClone(option)
  // 模型转述 JSON 时偶尔会把 series 的方括号吞掉（数组写成对象），
  // 这里补回来，否则下面的 map 拿到空数组，只会画出标题和一个空白画布。
  if (themed.series && !Array.isArray(themed.series)) {
    themed.series = [themed.series as never]
  }
  const seriesList = Array.isArray(themed.series) ? (themed.series as Record<string, unknown>[]) : []
  const primaryType = String(seriesList[0]?.type ?? 'line')

  themed.series = seriesList.map((s) => {
    const next = { ...s }
    if (next.itemStyle && typeof next.itemStyle === 'object') {
      const { color: _drop, ...rest } = next.itemStyle as Record<string, unknown>
      next.itemStyle = rest
    }
    if (next.type === 'bar' && !next.name) next.name = '销售额'
    if (next.type === 'line') {
      next.smooth = true
      next.symbolSize = 6
      next.lineStyle = { width: 3, color: LINE_COLOR }
      next.itemStyle = { color: LINE_COLOR }
      // 面积渐变，与设计稿一致
      next.areaStyle = {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(91,104,246,0.18)' },
            { offset: 1, color: 'rgba(91,104,246,0.06)' },
          ],
        },
      }
    }
    if (next.type === 'pie') {
      next.itemStyle = { borderColor: '#FFFFFF', borderWidth: 2 }
    }
    return next
  })

  themed.color = primaryType === 'pie' ? PIE_COLORS : BAR_COLORS
  themed.textStyle = { color: '#7A83A6', fontFamily: 'inherit', fontSize: 12 }

  if (themed.title && typeof themed.title === 'object') {
    themed.title = {
      ...(themed.title as Record<string, unknown>),
      textStyle: { color: '#17214A', fontSize: 16, fontWeight: 600 },
    }
  }

  themed.tooltip = {
    ...(typeof themed.tooltip === 'object' ? (themed.tooltip as Record<string, unknown>) : {}),
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: '#E1E5F5',
    borderWidth: 1,
    textStyle: { color: '#17214A', fontSize: 12 },
    extraCssText: 'border-radius:10px;box-shadow:0 12px 40px rgba(59,65,130,.10);',
  }

  const restyleAxis = (a: unknown) => {
    if (!a || typeof a !== 'object') return a
    const axis = a as Record<string, unknown>
    return {
      ...axis,
      axisLine: { lineStyle: { color: '#E1E5F5' } },
      axisTick: { show: false },
      axisLabel: { ...(axis.axisLabel ?? {}), color: '#7A83A6' },
      splitLine: { lineStyle: { color: '#E9ECF7' } },
    }
  }

  // xAxis / yAxis 可能是对象也可能是数组
  if (themed.xAxis) {
    themed.xAxis = Array.isArray(themed.xAxis) ? themed.xAxis.map(restyleAxis) : restyleAxis(themed.xAxis)
  }
  if (themed.yAxis) {
    themed.yAxis = Array.isArray(themed.yAxis) ? themed.yAxis.map(restyleAxis) : restyleAxis(themed.yAxis)
  }

  return themed
}

export type ChartState = 'ready' | 'loading' | 'empty' | 'failed'

interface Props {
  option?: ChartOption
  state?: ChartState
  onRetry?: () => void
}

/**
 * 图表卡片。容器恒为 320px 且始终挂载，非就绪状态用覆盖层压在上面。
 * 不能改成 display:none —— ECharts 会在宽度为 0 的元素上初始化，之后 resize 也救不回来。
 */
export function ChartCard({ option, state = 'ready', onRetry }: Props) {
  const { t, lang } = useLang()
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const chart = echarts.init(host)
    chartRef.current = chart

    // 会话区宽度会随窗口和侧栏变化，不监听 resize 图表会一直用初始尺寸
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(host)

    return () => {
      observer.disconnect()
      // 不 dispose 会一直持有 canvas 与事件监听，长对话下是真实的内存泄漏
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    if (state !== 'ready' || !option || !chartRef.current) return
    // notMerge=true：折线带 xAxis/yAxis 而饼图没有，合并会让饼图继承上一张图的坐标轴
    chartRef.current.setOption(localizeChart(applyTheme(option), lang), true)
    chartRef.current.resize()
  }, [option, state, lang])

  return (
    <figure className="my-3 rounded-chart border border-line bg-surface p-4">
      <div className="relative" style={{ height: 320 }}>
        <div ref={hostRef} className="h-full w-full" />

        {state === 'loading' && (
          <div className="absolute inset-0 flex flex-col justify-center gap-3 bg-surface px-2" aria-label={t('chart.loading')}>
            <div className="h-3 w-32 animate-pulse rounded bg-line/70" />
            <div className="flex flex-1 items-end gap-3">
              {[52, 78, 64, 90, 46, 70].map((h, i) => (
                <div key={i} className="flex-1 animate-pulse rounded-t bg-line/60" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="h-px w-full bg-chart-grid" />
          </div>
        )}

        {state === 'empty' && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface text-ui text-ink-mute">
            {t('chart.empty')}
          </div>
        )}

        {state === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface">
            <p className="text-ui text-ink-soft">{t('chart.failed')}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                aria-label={t('chart.retry')}
                className="rounded-btn border border-line px-3 py-1.5 text-hint text-ink-soft transition hover:border-brand/40 hover:text-brand"
              >
                {t('chart.retry')}
              </button>
            )}
          </div>
        )}
      </div>
    </figure>
  )
}

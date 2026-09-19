import type { ChartOption } from '../types'

/**
 * 三类图表的示例 option，仅供设计稿对照与占位展示，不参与真实对话。
 * 真实数据库只有 4 个大区，设计图上的「华中区 / 西北区」是示意。
 */

const REGIONS = ['华东区', '华南区', '华北区', '西南区']
const BAR_COLORS = ['#5271FF', '#815AF6', '#36B98A', '#F2A43B']
const PIE_COLORS = ['#5271FF', '#805AD5', '#3ABF8A', '#F5A23A']

export const MOCK_LINE: ChartOption = {
  title: { text: '华东区近6个月销售趋势' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'] },
  yAxis: { type: 'value', name: '销售额（元）' },
  series: [
    {
      type: 'line',
      name: '销售额',
      smooth: true,
      data: [1234567, 1345678, 1100200, 1450900, 1567800, 1698000],
    },
  ],
}

export const MOCK_BAR: ChartOption = {
  title: { text: '各大区销售额对比' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: REGIONS, axisLabel: { rotate: 30 } },
  yAxis: { type: 'value', name: '销售额（元）' },
  series: [{ type: 'bar', name: '销售额', data: [5820000, 4310000, 3990000, 2105000] }],
  color: BAR_COLORS,
}

export const MOCK_PIE: ChartOption = {
  title: { text: '各大区销售占比', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      type: 'pie',
      radius: '55%',
      data: [
        { name: '华东区', value: 5820000 },
        { name: '华南区', value: 4310000 },
        { name: '华北区', value: 3990000 },
        { name: '西南区', value: 2105000 },
      ],
    },
  ],
  color: PIE_COLORS,
}

/**
 * 空会话时的推荐提问。
 * label 随界面语言切换，query 始终是中文 —— 后端工具的大区参数走中文白名单，
 * 发英文原文会被参数校验拦下。
 */
export interface Suggestion {
  label: 'sug.1' | 'sug.2' | 'sug.3' | 'sug.4'
  query: string
}

export const SUGGESTIONS: Suggestion[] = [
  { label: 'sug.1', query: '上个月华南区谁卖得最好？' },
  { label: 'sug.2', query: '画出近 6 个月的销售趋势图' },
  { label: 'sug.3', query: '各大区业绩对比，用柱状图展示' },
  { label: 'sug.4', query: '检测一下当前的销售数据有没有异常' },
]

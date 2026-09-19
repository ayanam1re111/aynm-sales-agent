export type Role = 'SALES_DIRECTOR' | 'SALES_MANAGER' | 'SALES_REP'

/** 后端登录接口只返回 token / username / role，不含大区。演示账号的大区在前端补全 */
export interface AuthUser {
  token: string
  username: string
  role: Role
  repId: number
  /** 数据范围文案，如「全公司数据」「华南区」「仅本人数据」 */
  scope: string
}

/** 后端图表工具返回的是完整的 ECharts option 对象，可直接交给 setOption */
export type ChartOption = Record<string, unknown>

export type Segment =
  | { type: 'text'; content: string }
  | { type: 'chart'; option: ChartOption }
  /** 流式过程中图表 JSON 尚未传完，占位用 */
  | { type: 'chart-loading' }

export interface Message {
  id: string
  role: 'user' | 'assistant'
  /**
   * 原始全文。图表由后端经独立的 chart 事件下发，正文里只留 [[CHART]] 占位符；
   * 历史消息可能仍是旧的 CHART_JSON:<json> 内联格式，两种都能解析。
   */
  content: string
  /**
   * 后端下发的图表 option，按生成顺序排列，用来填 content 里的 [[CHART]] 占位符。
   * 必须一起持久化 —— 刷新后正文里只有占位符，丢了这份数据图就没了。
   */
  charts?: ChartOption[]
  /** 解析后的有序片段，渲染用 */
  segments: Segment[]
  /** 后端返回的耗时，仅同步接口有；流式由前端自行计时 */
  durationMs?: number
  /** 出错或中断的提示文案 */
  error?: string
  streaming?: boolean
  createdAt: number
}

export interface Session {
  /** 同时作为后端的 sessionId，刷新后必须复用才能接上对话记忆 */
  id: string
  title: string
  createdAt: number
  messages: Message[]
}

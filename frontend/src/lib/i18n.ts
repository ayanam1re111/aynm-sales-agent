export type Lang = 'zh' | 'en'

/**
 * 界面文案词典。只翻译 UI chrome —— Agent 的回答来自后端，始终是中文。
 */
export const DICT = {
  zh: {
    'lang.switch': 'English',

    'brand.name1': '智能销售数据分析',
    'brand.name2': 'Agent',
    'brand.tagline': '用数据洞察业务，让每一次销售决策更智能',
    'brand.value1': '更快的洞察',
    'brand.value1d': '从数据中发现销售机会',
    'brand.value2': '更智能的决策',
    'brand.value2d': 'AI 驱动的数据分析',
    'brand.value3': '更高的业绩',
    'brand.value3d': '让数据创造更多可能',
    'brand.footer': 'AI EMPOWERS SALES SUCCESS',
    'brand.k1': '数据',
    'brand.k2': '洞察',
    'brand.k3': '机会',
    'brand.k4': '增长',
    'brand.slogan1': '让数据发声',
    'brand.slogan2': '让业绩看得见',

    'login.title': '欢迎登录',
    'login.subtitle': '请输入账号信息以继续',
    'login.userId': '用户 ID',
    'login.userIdPlaceholder': '请输入用户 ID',
    'login.password': '密码',
    'login.passwordPlaceholder': '请输入密码',
    'login.show': '显示密码',
    'login.hide': '隐藏密码',
    'login.submit': '登录',
    'login.submitting': '登录中…',
    'login.quick': '快速体验',
    'login.scopeHint': '不同角色可查看的数据范围不同',
    'login.errId': '用户 ID 需为正整数',

    'role.SALES_DIRECTOR': '销售总监',
    'role.SALES_MANAGER': '销售经理',
    'role.SALES_REP': '销售员',
    'scope.SALES_DIRECTOR': '全公司数据',
    'scope.SALES_MANAGER': '所辖大区',
    'scope.SALES_REP': '仅本人数据',

    'sidebar.new': '新建对话',
    'sidebar.history': '历史对话',
    'sidebar.empty': '暂无历史会话',
    'sidebar.signOut': '退出登录',

    'empty.title': '想分析哪些销售数据？',
    'empty.subtitle': '用自然语言提问，Agent 会自己决定查什么、怎么算',

    'composer.placeholder': '请输入你的问题，或描述你想分析的销售数据…',
    'composer.send': '发送',
    'composer.stop': '停止',
    'composer.tooLong': '消息不能超过 {n} 字（当前 {c}）',

    'msg.thinking': '正在生成分析…',
    'msg.duration': '耗时 {v}',
    'msg.stopped': '已停止生成',

    'chart.loading': '图表加载中',
    'chart.empty': '当前条件下暂无可视化数据',
    'chart.failed': '图表生成失败',
    'chart.retry': '重新生成图表',

    'sug.1': '上个月华南区谁卖得最好？',
    'sug.2': '画出近 6 个月的销售趋势图',
    'sug.3': '各大区业绩对比，用柱状图展示',
    'sug.4': '检测一下当前的销售数据有没有异常',

    'err.network': '无法连接后端服务，请确认服务已启动',
    'err.expired': '登录已失效，请重新登录',
    'err.login': '登录失败',
    'err.request': '请求失败',
    'err.stream': '连接已中断，请重试',
    'err.streamBusy': '服务暂时不可用，请稍后重试',
    'err.emptyBody': '响应体为空，无法读取流式内容',
  },
  en: {
    'lang.switch': '中文',

    'brand.name1': 'Intelligent Sales Analytics',
    'brand.name2': 'Agent',
    'brand.tagline': 'Turn raw sales data into decisions, every time',
    'brand.value1': 'Faster insight',
    'brand.value1d': 'Find opportunities in the data',
    'brand.value2': 'Smarter decisions',
    'brand.value2d': 'Analysis driven by AI',
    'brand.value3': 'Better results',
    'brand.value3d': 'Let data create the upside',
    'brand.footer': 'AI EMPOWERS SALES SUCCESS',
    'brand.k1': 'Data',
    'brand.k2': 'Insight',
    'brand.k3': 'Opportunity',
    'brand.k4': 'Growth',
    'brand.slogan1': 'Let data speak',
    'brand.slogan2': 'Let results show',

    'login.title': 'Welcome back',
    'login.subtitle': 'Sign in to continue',
    'login.userId': 'User ID',
    'login.userIdPlaceholder': 'Enter your user ID',
    'login.password': 'Password',
    'login.passwordPlaceholder': 'Enter your password',
    'login.show': 'Show password',
    'login.hide': 'Hide password',
    'login.submit': 'Sign in',
    'login.submitting': 'Signing in…',
    'login.quick': 'Quick demo',
    'login.scopeHint': 'Each role sees a different slice of the data',
    'login.errId': 'User ID must be a positive number',

    'role.SALES_DIRECTOR': 'Director',
    'role.SALES_MANAGER': 'Manager',
    'role.SALES_REP': 'Sales Rep',
    'scope.SALES_DIRECTOR': 'All regions',
    'scope.SALES_MANAGER': 'Own region',
    'scope.SALES_REP': 'Own records',

    'sidebar.new': 'New chat',
    'sidebar.history': 'History',
    'sidebar.empty': 'No conversations yet',
    'sidebar.signOut': 'Sign out',

    'empty.title': 'What would you like to analyse?',
    'empty.subtitle': 'Ask in plain language; the agent decides what to query and how',

    'composer.placeholder': 'Ask a question, or describe the sales data you want…',
    'composer.send': 'Send',
    'composer.stop': 'Stop',
    'composer.tooLong': 'Message must be under {n} characters (currently {c})',

    'msg.thinking': 'Analysing…',
    'msg.duration': 'Took {v}',
    'msg.stopped': 'Generation stopped',

    'chart.loading': 'Loading chart',
    'chart.empty': 'No visualisable data for this query',
    'chart.failed': 'Chart generation failed',
    'chart.retry': 'Regenerate chart',

    'sug.1': 'Who sold the most in South China last month?',
    'sug.2': 'Chart the sales trend over the last 6 months',
    'sug.3': 'Compare all regions with a bar chart',
    'sug.4': 'Are there any anomalies in the sales data?',

    'err.network': 'Cannot reach the backend — is it running?',
    'err.expired': 'Session expired, please sign in again',
    'err.login': 'Sign-in failed',
    'err.request': 'Request failed',
    'err.stream': 'Connection interrupted, please retry',
    'err.streamBusy': 'Service unavailable, please retry later',
    'err.emptyBody': 'Empty response body',
  },
} as const

export type MessageKey = keyof (typeof DICT)['zh']

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  let text: string = DICT[lang][key] ?? DICT.zh[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

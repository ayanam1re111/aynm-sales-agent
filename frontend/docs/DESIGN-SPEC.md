# 设计规范

本文档是实现时唯一的数值依据。改动色值 / 尺寸请先改这里，再同步 `tailwind.config.js`。

视觉参考：`public/mockups/login-page.png`、`public/mockups/main-interface.png`

---

## 1. 色板

| Token | 色值 | 用途 |
| --- | --- | --- |
| `bg` | `#F5F7FF` | 页面背景 |
| `sidebar` | `#F1F3FF` | 会话列表栏 |
| `surface` | `#FFFFFF` | 卡片 |
| `glass` | `rgba(255,255,255,.74)` | 玻璃层 |
| `ink` | `#17214A` | 主文字 |
| `ink-soft` | `#66709A` | 次文字 |
| `ink-mute` | `#98A1C0` | 时间、耗时 |
| `line` | `#E1E5F5` | 边框 |
| `brand` | `#625BF6` | 主按钮 |
| `brand-cyan` | `#38BDF8` | 科技光、焦点 |
| `danger` | `#E5484D` | 高优先级 |
| `warning` | `#E9A23B` | 中优先级 |
| `info` | `#3B82F6` | 低优先级 |

**主渐变**：`linear-gradient(135deg, #625BF6 0%, #4D9BFF 65%, #38C6E8 100%)`

## 2. 字体层级

字体栈：`Inter, PingFang SC, Microsoft YaHei, system-ui, sans-serif`

| 层级 | 字号 / 行高 | 字重 |
| --- | --- | --- |
| 产品标题 | 24px / 32px | 700 |
| 会话标题 | 18px / 26px | 600 |
| 图表标题 | 16px / 24px | 600 |
| 消息正文 | 15px / 26px | 400 |
| 按钮、侧栏 | 14px / 22px | 500 |
| 辅助信息 | 13px / 20px | 400 |
| 时间、耗时 | 12px / 18px | 400 |

## 3. 圆角 · 阴影 · 间距

- 圆角：按钮与输入框 `12px`，消息气泡 `16px`，图表卡片 `14px`，主卡片 `20px`
- 阴影：`0 12px 40px rgba(59,65,130,.10)`
- 间距梯度：`4 / 8 / 12 / 16 / 20 / 24 / 32px`

## 4. 布局

| 区域 | 规格 |
| --- | --- |
| 桌面基准 | 1440×900 |
| 品牌栏 | 280px（<1280px 隐藏） |
| 会话栏 | 272px |
| 顶栏 | 72px |
| 输入区 | 最小 88px，最大 180px |
| Agent 回答 | 最大宽度 860px |
| 用户气泡 | 最大宽度 560px |
| ECharts | 宽 100%，高 320px |
| 悬浮 Agent | 宽 120–145px，right 24px，bottom 104px |

> 原文档标注「最小宽度 1180px」是按两栏设计给的。本项目采用三栏，因此品牌栏在 1280px 以下收起，1180–1280px 之间退化为两栏。

## 5. 图表配色

- 折线：`#5B68F6`，面积渐变至 `rgba(91,104,246,.06)`
- 柱状：`#5271FF` `#815AF6` `#36B98A` `#F2A43B` `#36B9D7` `#EB5795`
- 饼图：`#5271FF` `#805AD5` `#3ABF8A` `#F5A23A` `#36B9D7` `#EB5795`
- 网格线 `#E9ECF7`，坐标文字 `#7A83A6`

后端在 `ChartGeneratorTool` 里给折线和柱状写死了 `itemStyle.color`（ECharts 老默认色），渲染前需剥离该字段，让颜色回落到本节调色板。**只改颜色，不动数据。**

## 6. 正文排版

后端返回纯文本加换行，不是 Markdown，**不得渲染 Markdown 表格**：

```css
.agent-answer {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 15px;
  line-height: 1.75;
  font-variant-numeric: tabular-nums;
}
```

## 7. 素材

全部为 RGBA PNG，位于 `public/assets/`：

| 文件 | 用途 |
| --- | --- |
| `mascot/agent-labrador-full.png` | 悬浮助手（浮在会话画布右下） |
| `mascot/agent-labrador-avatar.png` | Agent 消息头像 |
| `decorations/data-orb.png` | 登录页品牌区 / 侧栏数据球 |
| `decorations/header-data-flow.png` | 顶部数据流光带 |
| `decorations/circuit-overlay.png` | 主内容区电路纹理 |

不得替换为 emoji、通用机器人图标、在线图片或 CSS 占位图。

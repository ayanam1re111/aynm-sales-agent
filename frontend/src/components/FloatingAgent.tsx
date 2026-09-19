const A = '/assets/sales-agent'

interface Props {
  /** 流式生成中：胸前数据核心叠加呼吸光效 */
  active?: boolean
}

/**
 * 悬浮助手：固定在会话画布右下角、输入框上方，不随消息滚动。
 * 定位与浮动动画在 .agent-mascot 里（styles/index.css），
 * 小于 1280px 自动隐藏，避免遮挡正文与图表。
 */
export function FloatingAgent({ active = false }: Props) {
  return (
    <div className="agent-mascot" aria-hidden="true">
      <div className="relative">
        <img
          src={`${A}/agent-ambient-orbit.png`}
          alt=""
          className="pointer-events-none absolute bottom-[10%] left-1/2 w-[145%] max-w-none -translate-x-1/2 select-none opacity-55"
        />
        <img
          src={`${A}/agent-labrador-full.png`}
          alt=""
          className="relative w-full select-none"
          draggable={false}
        />
        {active && (
          <img
            src={`${A}/ai-pulse-rings.png`}
            alt=""
            className="pointer-events-none absolute left-1/2 top-[42%] w-[70%] max-w-none -translate-x-1/2 select-none opacity-70 motion-safe:animate-dot-pulse"
          />
        )}
      </div>
    </div>
  )
}

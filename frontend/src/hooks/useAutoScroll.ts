import { useEffect, useRef } from 'react'

/**
 * 新内容自动滚到底，但用户主动往上翻时暂停。
 * 不做这个判断的话，正在回看历史时会被新消息反复拽回底部。
 */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null)
  const pinned = useRef(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight
      pinned.current = distance < 80
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [dep])

  return ref
}

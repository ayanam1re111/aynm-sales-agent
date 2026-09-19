import { useRef, useState } from 'react'
import { useLang } from '../store/useLang'

const MAX_LENGTH = 2000

interface Props {
  onSend: (text: string) => void
  onStop: () => void
  busy: boolean
}

export function Composer({ onSend, onStop, busy }: Props) {
  const { t } = useLang()
  const [value, setValue] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const tooLong = value.length > MAX_LENGTH
  const canSend = value.trim().length > 0 && !tooLong && !busy

  /** 静止 70px，随内容增长但最多三行 */
  const resize = () => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 70), 124)}px`
  }

  const submit = () => {
    if (!canSend) return
    onSend(value)
    setValue('')
    requestAnimationFrame(() => {
      if (areaRef.current) areaRef.current.style.height = '70px'
    })
  }

  return (
    <div className="px-7 pb-[18px]">
      <div className="mx-auto w-full max-w-[960px]">
        <div className="flex items-end gap-3 rounded-bubble border border-line bg-surface/92 p-2.5 shadow-card backdrop-blur-sm">
          <textarea
            ref={areaRef}
            value={value}
            rows={1}
            aria-label={t('composer.placeholder')}
            placeholder={t('composer.placeholder')}
            onChange={(e) => {
              setValue(e.target.value)
              resize()
            }}
            onKeyDown={(e) => {
              // Enter 发送，Shift+Enter 换行；中文输入法组词中的回车不算发送
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            className="flex-1 resize-none bg-transparent px-2 py-2.5 text-body text-ink outline-none
                       placeholder:text-ink-mute"
            style={{ height: 70 }}
          />

          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label={t('composer.stop')}
              className="flex shrink-0 items-center gap-2 rounded-btn border border-line px-5 py-2.5 text-ui font-medium text-ink-soft
                         transition hover:border-danger/40 hover:text-danger"
            >
              <span className="h-2.5 w-2.5 rounded-[2px] bg-current" />
              {t('composer.stop')}
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label={t('composer.send')}
              className="flex shrink-0 items-center gap-2 rounded-btn bg-brand-gradient px-5 py-2.5 text-ui font-medium
                         text-white shadow-card transition hover:brightness-105
                         disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('composer.send')}
            </button>
          )}
        </div>

        {tooLong && (
          <p className="mt-2 pl-1 text-hint text-danger">
            {t('composer.tooLong', { n: MAX_LENGTH, c: value.length })}
          </p>
        )}
      </div>
    </div>
  )
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translate, type Lang, type MessageKey } from '../lib/i18n'

const STORAGE_KEY = 'aynm.lang'

interface LangContextValue {
  lang: Lang
  toggle: () => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'zh'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const toggle = useCallback(() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh')), [])
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  )

  const value = useMemo(() => ({ lang, toggle, t }), [lang, toggle, t])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang 必须在 LangProvider 内使用')
  return ctx
}

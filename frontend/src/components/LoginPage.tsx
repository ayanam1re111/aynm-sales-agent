import { useState } from 'react'
import { login } from '../api/chat'
import { DEMO_ACCOUNTS } from '../mock/users'
import { useLang } from '../store/useLang'
import type { AuthUser, Role } from '../types'
import { LangSwitch } from './LangSwitch'
import { PersonIcon } from './PersonIcon'

const A = '/assets/sales-agent'

const VALUE_PROPS = [
  { icon: `${A}/icon-insight.png`, title: 'brand.value1', desc: 'brand.value1d' },
  { icon: `${A}/icon-decision.png`, title: 'brand.value2', desc: 'brand.value2d' },
  { icon: `${A}/icon-growth.png`, title: 'brand.value3', desc: 'brand.value3d' },
] as const

const ROLE_KEY: Record<Role, 'role.SALES_DIRECTOR' | 'role.SALES_MANAGER' | 'role.SALES_REP'> = {
  SALES_DIRECTOR: 'role.SALES_DIRECTOR',
  SALES_MANAGER: 'role.SALES_MANAGER',
  SALES_REP: 'role.SALES_REP',
}

interface Props {
  onLogin: (user: AuthUser) => void
}

export function LoginPage({ onLogin }: Props) {
  const { t } = useLang()
  const [repId, setRepId] = useState('13')
  const [password, setPassword] = useState('123456')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const doLogin = async (id: number, pwd: string) => {
    if (pending) return
    setPending(true)
    setError('')
    try {
      onLogin(await login(id, pwd))
    } catch (e) {
      setError((e as Error).message || t('err.login'))
    } finally {
      setPending(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = Number(repId)
    if (!Number.isInteger(id) || id <= 0) {
      setError(t('login.errId'))
      return
    }
    void doLogin(id, password)
  }

  return (
    <div className="relative flex h-full overflow-hidden bg-page-gradient">
      {/* ============ 背景流光层：铺满整页，不参与交互 ============ */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]">
        <img
          src={`${A}/login-top-flow.png`}
          className="absolute left-0 top-0 w-full select-none opacity-[0.32]"
        />
        <img
          src={`${A}/login-bottom-horizon-flow.png`}
          className="absolute bottom-0 left-0 w-[76%] select-none opacity-[0.55]"
        />
        <img
          src={`${A}/sparkle-particles.png`}
          className="absolute left-[26%] top-[7%] w-[min(320px,19vw)] select-none opacity-30"
        />
        <img
          src={`${A}/circuit-particle-flow.png`}
          className="absolute left-[2%] top-[52%] w-[min(620px,38vw)] select-none opacity-20"
        />
        <img
          src={`${A}/data-light-stage.png`}
          className="absolute left-[-5%] top-[40%] w-[min(620px,44vw)] select-none opacity-55"
        />
      </div>

      <LangSwitch className="absolute right-6 top-6 z-[6]" />

      {/* 拉布拉多：页面级定位，脚下光环完整不被裁 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[3%] left-[38%] z-[3] hidden w-[clamp(420px,36vw,590px)] -translate-x-1/2 lg:block"
      >
        <img
          src={`${A}/agent-ambient-orbit.png`}
          className="absolute bottom-[8%] left-1/2 w-[145%] max-w-none -translate-x-1/2 select-none opacity-55"
        />
        <img
          src={`${A}/holographic-halo-platform.png`}
          className="absolute bottom-[2%] left-1/2 w-[128%] max-w-none -translate-x-1/2 select-none"
        />
        <img
          src={`${A}/agent-labrador-full.png`}
          className="relative w-full select-none drop-shadow-[0_18px_34px_rgba(74,102,190,0.18)]"
        />
        <img
          src={`${A}/holographic-analytics-card.png`}
          className="absolute left-[-9%] top-[26%] w-[42%] max-w-none select-none motion-safe:animate-agent-float"
        />
      </div>

      {/* ============ 左栏 60%：品牌与卖点 ============ */}
      <section className="relative hidden flex-[1.5] lg:block">
        <div className="relative z-[4] px-[clamp(36px,4.6vw,80px)] pt-[clamp(40px,6.4vh,80px)]">
          <h1 className="font-display text-[clamp(30px,3vw,46px)] font-black leading-[1.16] tracking-[-0.02em]">
            <span className="bg-gradient-to-br from-[#182451] via-[#2B3277] to-[#5964F5] bg-clip-text text-transparent">
              {t('brand.name1')}
            </span>
            <span className="ml-3 bg-gradient-to-br from-brand to-brand-cyan bg-clip-text text-transparent">
              {t('brand.name2')}
            </span>
          </h1>
          <span className="mt-3 block h-[3px] w-[72px] rounded-full bg-brand-gradient" />
          <p className="mt-3 max-w-[430px] text-body text-ink-soft">{t('brand.tagline')}</p>

          <ul className="mt-[clamp(22px,3vh,34px)] w-[clamp(230px,26vw,350px)] space-y-[clamp(12px,1.8vh,20px)]">
            {VALUE_PROPS.map((v) => (
              <li key={v.title} className="flex items-center gap-4">
                <img
                  src={v.icon}
                  alt=""
                  className="h-[58px] w-[58px] shrink-0 select-none"
                />
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{t(v.title)}</span>
                  <span className="mt-0.5 block text-hint text-ink-soft">{t(v.desc)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="absolute bottom-[clamp(20px,3vh,34px)] left-[clamp(36px,4.6vw,80px)] z-[4] text-meta leading-relaxed tracking-[0.18em] text-ink-soft">
          {t('brand.footer')}
        </p>
      </section>

      {/* ============ 右栏 40%：玻璃登录卡 ============ */}
      <section className="relative z-[4] flex flex-1 items-center justify-center px-6">
        <div
          className="w-full max-w-[470px] rounded-card p-8"
          style={{
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(255,255,255,0.86)',
            boxShadow: '0 24px 70px rgba(74,102,190,0.16)',
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          }}
        >
          <h2 className="font-display text-product font-bold text-ink">{t('login.title')}</h2>
          <p className="mt-1 text-hint text-ink-soft">{t('login.subtitle')}</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-ui font-medium text-ink">{t('login.userId')}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={repId}
                onChange={(e) => setRepId(e.target.value.replace(/\D/g, ''))}
                placeholder={t('login.userIdPlaceholder')}
                className="mt-2 w-full rounded-btn border border-line bg-surface/80 px-3.5 py-3 text-body text-ink outline-none
                           transition placeholder:text-ink-mute focus:border-brand/50"
              />
            </label>

            <label className="block">
              <span className="text-ui font-medium text-ink">{t('login.password')}</span>
              <span className="relative mt-2 block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  className="w-full rounded-btn border border-line bg-surface/80 px-3.5 py-3 pr-11 text-body text-ink outline-none
                             transition placeholder:text-ink-mute focus:border-brand/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('login.hide') : t('login.show')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute transition hover:text-ink-soft"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </span>
            </label>

            {error && <p className="rounded-btn bg-danger/10 px-3 py-2 text-hint text-danger">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-btn bg-brand-gradient py-3 text-body font-medium text-white shadow-card
                         transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="mt-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-hint text-ink-mute">{t('login.quick')}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mt-4 space-y-2.5">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.repId}
                type="button"
                disabled={pending}
                onClick={() => {
                  setRepId(String(a.repId))
                  setPassword('123456')
                  void doLogin(a.repId, '123456')
                }}
                className="flex w-full items-center gap-3 rounded-btn border border-line bg-surface/80 px-4 py-2.5 text-left
                           transition hover:-translate-y-0.5 hover:border-brand/30 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <PersonIcon role={a.role} />
                <span className="text-ui text-ink">
                  {a.name}
                  <span className="mx-1.5 text-ink-mute">·</span>
                  {t(ROLE_KEY[a.role])}
                </span>
              </button>
            ))}
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-hint text-ink-mute">
            <span aria-hidden="true">ⓘ</span>
            {t('login.scopeHint')}
          </p>
        </div>
      </section>
    </div>
  )
}

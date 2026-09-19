import { useCallback, useEffect, useState } from 'react'
import { setUnauthorizedHandler } from './api/client'
import { AppShell } from './components/AppShell'
import { LoginPage } from './components/LoginPage'
import { loadAuth, saveAuth } from './lib/storage'
import type { AuthUser } from './types'

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => loadAuth())

  const signOut = useCallback(() => {
    saveAuth(null)
    setUser(null)
  }, [])

  // 任何请求拿到 401 都会踢回登录页。
  // 后端用内存存 token，重启后旧 token 全部失效，必须有这条兜底。
  useEffect(() => {
    setUnauthorizedHandler(signOut)
    return () => setUnauthorizedHandler(null)
  }, [signOut])

  const handleLogin = useCallback((u: AuthUser) => {
    saveAuth(u)
    setUser(u)
  }, [])

  return user ? <AppShell user={user} onSignOut={signOut} /> : <LoginPage onLogin={handleLogin} />
}

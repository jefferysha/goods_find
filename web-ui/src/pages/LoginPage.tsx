import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CyberScene from '@/components/login/CyberScene'
import { apiLogin, apiRegister } from '@/api/auth'
import { setAuth, isAuthenticated } from '@/api/http'

const FULL_TITLE = '二手商品智能分析平台'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [titleText, setTitleText] = useState('')
  const [showCursor, setShowCursor] = useState(true)

  // 如果已登录，直接跳转
  useEffect(() => {
    if (isAuthenticated()) {
      const redirect = searchParams.get('redirect') || '/dashboard'
      navigate(redirect, { replace: true })
    }
  }, [navigate, searchParams])

  // Typewriter effect
  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index <= FULL_TITLE.length) {
        setTitleText(FULL_TITLE.slice(0, index))
        index++
      } else {
        clearInterval(timer)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [])

  // Blinking cursor
  useEffect(() => {
    const timer = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)
    return () => clearInterval(timer)
  }, [])

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'))
    setError('')
    setConfirmPassword('')
    setDisplayName('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // 注册模式校验
    if (mode === 'register') {
      if (username.length < 3) {
        setError('用户名至少 3 个字符')
        return
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('用户名只能包含字母、数字和下划线')
        return
      }
      if (password.length < 6) {
        setError('密码至少 6 个字符')
        return
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }
    }

    setLoading(true)

    try {
      const result =
        mode === 'login'
          ? await apiLogin({ username, password })
          : await apiRegister({
              username,
              password,
              display_name: displayName || undefined,
            })

      // 存储 Token 和用户信息
      setAuth(result.access_token, {
        id: result.user.id,
        username: result.user.username,
        display_name: result.user.display_name,
      })

      const redirect = searchParams.get('redirect') || '/dashboard'
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f6f3]">
      {/* Three.js background */}
      <CyberScene />

      {/* Login card overlay */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur-xl"
          style={{
            boxShadow:
              '0 8px 60px rgba(255,107,74,0.08), 0 2px 20px rgba(74,159,255,0.06)',
          }}
        >
          {/* Logo area */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#FF8F6B] text-xl font-bold text-white shadow-lg shadow-orange-200/50">
              鱼
            </div>
          </div>

          {/* Title with typewriter effect */}
          <h1 className="mb-1 bg-gradient-to-r from-[#FF6B4A] via-[#e0784a] to-[#4A9FFF] bg-clip-text text-center text-2xl font-bold text-transparent">
            {titleText}
            <span
              className={`ml-0.5 inline-block text-[#FF6B4A] transition-opacity ${
                showCursor ? 'opacity-100' : 'opacity-0'
              }`}
            >
              |
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mb-8 text-center text-sm text-muted-foreground">
            {mode === 'login' ? '智能监控 · 数据分析 · 实时提醒' : '创建账户 · 开始使用'}
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                用户名
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === 'register' ? '3-32位字母、数字或下划线' : '请输入用户名'}
                required
                autoComplete="username"
                className="border-border bg-white/80 text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#FF6B4A] focus-visible:ring-[#FF6B4A]/20"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium text-foreground">
                  昵称 <span className="text-muted-foreground">(可选)</span>
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="显示名称"
                  autoComplete="name"
                  className="border-border bg-white/80 text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#FF6B4A] focus-visible:ring-[#FF6B4A]/20"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少 6 个字符' : '请输入密码'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="border-border bg-white/80 text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#FF6B4A] focus-visible:ring-[#FF6B4A]/20"
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  确认密码
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  required
                  autoComplete="new-password"
                  className="border-border bg-white/80 text-foreground placeholder:text-muted-foreground/50 focus-visible:border-[#FF6B4A] focus-visible:ring-[#FF6B4A]/20"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#FF6B4A] to-[#FF8F6B] text-white shadow-lg shadow-orange-200/40 transition-all hover:from-[#FF5A38] hover:to-[#FF7E5A] hover:shadow-orange-300/50 active:scale-[0.98]"
            >
              {loading
                ? mode === 'login'
                  ? '登录中...'
                  : '注册中...'
                : mode === 'login'
                  ? '登录'
                  : '注册'}
            </Button>
          </form>

          {/* Mode switch */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={switchMode}
              className="text-sm text-muted-foreground transition-colors hover:text-[#FF6B4A]"
            >
              {mode === 'login' ? '没有账户？点击注册' : '已有账户？返回登录'}
            </button>
          </div>

          {/* Decorative bottom line */}
          <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-[#FF6B4A]/15 to-transparent" />

          {/* Version info */}
          <p className="mt-4 text-center text-xs text-muted-foreground/50">
            v2.0.0
          </p>
        </div>
      </div>
    </div>
  )
}

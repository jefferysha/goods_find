import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import LoginPage from '../LoginPage'

vi.mock('@/api/auth', () => ({
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
}))

vi.mock('@/api/http', () => ({
  setAuth: vi.fn(),
  isAuthenticated: () => false,
}))

vi.mock('@/components/login/CyberScene', () => ({
  default: () => <div data-testid="cyber-scene" />,
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders login form', () => {
    render(<LoginPage />)
    // Advance timers to complete typewriter effect
    vi.advanceTimersByTime(2000)
    expect(screen.getByTestId('cyber-scene')).toBeInTheDocument()
  })

  it('has username and password inputs', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
  })

  it('has login button', () => {
    render(<LoginPage />)
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })

  it('shows register link', () => {
    render(<LoginPage />)
    expect(screen.getByText('没有账户？点击注册')).toBeInTheDocument()
  })
})

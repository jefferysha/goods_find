import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import AccountsPage from '../AccountsPage'

vi.mock('@/api/accounts', () => ({
  listAccounts: vi.fn().mockResolvedValue([]),
  getAccount: vi.fn().mockResolvedValue({ name: '', content: '' }),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/lib/platforms', () => ({
  getAllPlatforms: () => [
    { id: 'xianyu', name: '闲鱼', color: '#FF6600', enabled: true },
    { id: 'zhuanzhuan', name: '转转', color: '#5AC8FA', enabled: false },
  ],
  getEnabledPlatforms: () => [
    { id: 'xianyu', name: '闲鱼', color: '#FF6600', enabled: true },
  ],
  getPlatform: (id: string) => {
    const map: Record<string, any> = {
      xianyu: { id: 'xianyu', name: '闲鱼', color: '#FF6600', enabled: true },
    }
    return map[id]
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/components/common/PlatformBadge', () => ({
  PlatformTabs: () => <div data-testid="platform-tabs" />,
  PlatformBadge: () => <span data-testid="platform-badge" />,
}))

describe('AccountsPage', () => {
  it('renders page title', () => {
    render(<AccountsPage />)
    expect(screen.getByText('账号管理')).toBeInTheDocument()
  })

  it('renders page description', () => {
    render(<AccountsPage />)
    expect(screen.getByText('管理各平台的登录状态，账号可绑定到监控任务。')).toBeInTheDocument()
  })

  it('renders platform tabs', () => {
    render(<AccountsPage />)
    expect(screen.getByText('闲鱼')).toBeInTheDocument()
    expect(screen.getByText('转转')).toBeInTheDocument()
  })

  it('has add account button for xianyu platform', () => {
    render(<AccountsPage />)
    expect(screen.getByText('+ 添加账号')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import TeamPage from '../TeamPage'

vi.mock('@/hooks/team/useTeam', () => ({
  useTeam: vi.fn(),
}))

vi.mock('@/hooks/team/useWorkspace', () => ({
  useWorkspace: vi.fn(() => ({
    workspaceData: null,
    isLoading: false,
    refresh: vi.fn(),
  })),
}))

vi.mock('@/api/http', () => ({
  getStoredUser: vi.fn(() => ({ id: 1, username: 'admin', display_name: '管理员' })),
}))

import { useTeam } from '@/hooks/team/useTeam'

const baseReturn = {
  members: [],
  performance: [],
  isLoading: false,
  refresh: vi.fn(),
}

describe('TeamPage', () => {
  beforeEach(() => {
    vi.mocked(useTeam).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<TeamPage />)
    expect(screen.getByText('团队工作台')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useTeam).mockReturnValue({
      ...baseReturn,
      isLoading: true,
    })
    render(<TeamPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('shows empty member state when no members', () => {
    render(<TeamPage />)
    expect(screen.getByText('暂无成员数据')).toBeInTheDocument()
  })

  it('renders member list when members exist', () => {
    vi.mocked(useTeam).mockReturnValue({
      ...baseReturn,
      members: [
        {
          user_id: 1,
          username: 'zhangsan',
          display_name: '张三',
          role: 'admin',
          avatar_url: '',
          focus_keywords: ['MacBook', 'iPhone'],
        },
        {
          user_id: 2,
          username: 'lisi',
          display_name: '李四',
          role: 'member',
          avatar_url: '',
          focus_keywords: ['iPad'],
        },
      ],
    })
    render(<TeamPage />)
    expect(screen.getByText('张三')).toBeInTheDocument()
    expect(screen.getByText('李四')).toBeInTheDocument()
    expect(screen.getByText('@zhangsan')).toBeInTheDocument()
    expect(screen.getByText('@lisi')).toBeInTheDocument()
  })

  it('renders tabs for admin and personal workspace', () => {
    render(<TeamPage />)
    expect(screen.getByText('团队管理')).toBeInTheDocument()
    expect(screen.getByText('我的工作台')).toBeInTheDocument()
  })

  it('renders performance table section', () => {
    render(<TeamPage />)
    expect(screen.getByText('团队业绩排行')).toBeInTheDocument()
  })

  it('renders performance data when available', () => {
    vi.mocked(useTeam).mockReturnValue({
      ...baseReturn,
      performance: [
        {
          user_id: 1,
          display_name: '张三',
          purchased_count: 10,
          sold_count: 8,
          revenue: 50000,
          cost: 35000,
          profit: 15000,
          profit_rate: 0.3,
        },
      ],
    })
    render(<TeamPage />)
    expect(screen.getByText('张三')).toBeInTheDocument()
  })
})

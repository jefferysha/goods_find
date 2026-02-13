import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import AlertsPage from '../AlertsPage'

vi.mock('@/hooks/alerts/useAlerts', () => ({
  useAlerts: vi.fn(),
}))

vi.mock('@/hooks/tasks/useTasks', () => ({
  useTasks: () => ({ tasks: [] }),
}))

vi.mock('@/components/alerts/AlertRuleList', () => ({
  AlertRuleList: ({ rules, loading }: any) => (
    <div data-testid="alert-rule-list">
      {loading ? '加载中...' : rules.length === 0 ? '暂无规则' : `${rules.length} 条规则`}
    </div>
  ),
}))

vi.mock('@/components/alerts/AlertRuleForm', () => ({
  AlertRuleForm: () => <div data-testid="alert-rule-form" />,
}))

import { useAlerts } from '@/hooks/alerts/useAlerts'

const baseReturn = {
  rules: [],
  loading: false,
  load: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}

describe('AlertsPage', () => {
  beforeEach(() => {
    vi.mocked(useAlerts).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<AlertsPage />)
    expect(screen.getByText('智能提醒')).toBeInTheDocument()
  })

  it('shows empty state when no rules', () => {
    render(<AlertsPage />)
    expect(screen.getByText('暂无规则')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useAlerts).mockReturnValue({ ...baseReturn, loading: true })
    render(<AlertsPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('has create rule button', () => {
    render(<AlertsPage />)
    expect(screen.getByText('创建规则')).toBeInTheDocument()
  })
})

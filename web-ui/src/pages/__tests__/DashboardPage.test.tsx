import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import DashboardPage from '../DashboardPage'

vi.mock('@/hooks/dashboard/useDashboard', () => ({
  useDashboard: vi.fn(),
}))

vi.mock('@/hooks/tasks/useTasks', () => ({
  useTasks: () => ({ tasks: [] }),
}))

vi.mock('@/components/dashboard/StatsCards', () => ({
  StatsCards: () => <div data-testid="stats-cards">Stats</div>,
}))

vi.mock('@/components/dashboard/BargainLeaderboard', () => ({
  BargainLeaderboard: () => <div data-testid="bargain-leaderboard">Bargains</div>,
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

import { useDashboard } from '@/hooks/dashboard/useDashboard'

const baseReturn = {
  stats: { total_items: 128, low_price_items: 23, active_tasks: 5, high_premium_items: 10, avg_premium_rate: -5, enabled_platforms: 2, total_platforms: 3, total_tasks: 5 },
  priceTrend: [],
  premiumDist: {},
  topKeywords: [],
  bargainList: [],
  profitSummary: null,
  dailyProfit: [],
  inventorySummary: null,
  agingAlerts: [],
  teamPerformance: [],
  profitByKeyword: [],
  loading: false,
  loadAll: vi.fn(),
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(useDashboard).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<DashboardPage />)
    expect(screen.getByText('经营驾驶舱')).toBeInTheDocument()
  })

  it('renders KPI cards', () => {
    render(<DashboardPage />)
    expect(screen.getByText('今日新发现')).toBeInTheDocument()
    expect(screen.getByText('可收商品')).toBeInTheDocument()
    expect(screen.getByText('本月营收')).toBeInTheDocument()
    expect(screen.getByText('本月利润')).toBeInTheDocument()
    expect(screen.getByText('利润率')).toBeInTheDocument()
    expect(screen.getByText('库存货值')).toBeInTheDocument()
  })

  it('renders chart sections', () => {
    render(<DashboardPage />)
    expect(screen.getByText('利润趋势（最近30天）')).toBeInTheDocument()
    expect(screen.getByText('品类利润排行')).toBeInTheDocument()
  })

  it('renders aging alerts section', () => {
    render(<DashboardPage />)
    expect(screen.getByText('库龄预警')).toBeInTheDocument()
  })

  it('renders team performance section', () => {
    render(<DashboardPage />)
    expect(screen.getByText('团队业绩排行')).toBeInTheDocument()
  })

  it('shows profit chart when data available', () => {
    vi.mocked(useDashboard).mockReturnValue({
      ...baseReturn,
      dailyProfit: [{ date: '2026-01-01', profit: 1000, revenue: 5000 }],
    })
    render(<DashboardPage />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})

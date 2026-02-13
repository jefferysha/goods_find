import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import ProfitPage from '../ProfitPage'

vi.mock('@/hooks/profit/useProfit', () => ({
  useProfit: vi.fn(),
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

import { useProfit } from '@/hooks/profit/useProfit'

const baseReturn = {
  records: [],
  summary: null,
  byKeyword: [],
  byAssignee: [],
  dailyTrend: [],
  isLoading: false,
  dateRange: {},
  setDateRange: vi.fn(),
  refresh: vi.fn(),
}

describe('ProfitPage', () => {
  beforeEach(() => {
    vi.mocked(useProfit).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<ProfitPage />)
    expect(screen.getByText('利润核算')).toBeInTheDocument()
  })

  it('shows empty state for sales records', () => {
    render(<ProfitPage />)
    expect(screen.getByText('暂无销售记录')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useProfit).mockReturnValue({
      ...baseReturn,
      isLoading: true,
    })
    render(<ProfitPage />)
    // Loading shown in the sales detail table
    const loadingElements = screen.getAllByText('加载中...')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('renders KPI summary cards when summary exists', () => {
    vi.mocked(useProfit).mockReturnValue({
      ...baseReturn,
      summary: {
        total_sold: 42,
        total_revenue: 120000,
        total_cost: 85000,
        net_profit: 35000,
        avg_profit_rate: 0.29,
      },
    })
    render(<ProfitPage />)
    expect(screen.getByText('本期已出')).toBeInTheDocument()
    expect(screen.getByText('总营收')).toBeInTheDocument()
    // "总成本" appears in both KPI card and sales detail table header
    expect(screen.getAllByText('总成本').length).toBeGreaterThanOrEqual(1)
    // "净利润" appears in both KPI card and sales detail table header
    expect(screen.getAllByText('净利润').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('平均利润率')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders chart when dailyTrend has data', () => {
    vi.mocked(useProfit).mockReturnValue({
      ...baseReturn,
      dailyTrend: [
        { date: '2026-01-01', profit: 1000, revenue: 5000, cost: 4000 },
        { date: '2026-01-02', profit: 1500, revenue: 6000, cost: 4500 },
      ],
    })
    render(<ProfitPage />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('shows chart empty state when no trend data', () => {
    render(<ProfitPage />)
    expect(screen.getByText('暂无趋势数据')).toBeInTheDocument()
  })

  it('renders keyword profit ranking chart when byKeyword has data', () => {
    vi.mocked(useProfit).mockReturnValue({
      ...baseReturn,
      byKeyword: [
        { keyword: 'MacBook', net_profit: 5000, total_revenue: 20000 },
      ],
    })
    render(<ProfitPage />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import MarketTrendPage from '../MarketTrendPage'

vi.mock('@/hooks/marketTrend/useMarketTrend', () => ({
  useMarketTrend: vi.fn(),
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
  Legend: () => null,
}))

import { useMarketTrend } from '@/hooks/marketTrend/useMarketTrend'

describe('MarketTrendPage', () => {
  beforeEach(() => {
    vi.mocked(useMarketTrend).mockReturnValue({
      keywords: [],
      selectedKeyword: null,
      setSelectedKeyword: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      data: null,
      isLoading: false,
      refresh: vi.fn(),
    })
  })

  it('renders page title', () => {
    render(<MarketTrendPage />)
    expect(screen.getByText('行情走势')).toBeInTheDocument()
  })

  it('shows empty state when no keywords', () => {
    render(<MarketTrendPage />)
    expect(screen.getByText(/暂无数据/)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useMarketTrend).mockReturnValue({
      keywords: ['test'],
      selectedKeyword: 'test',
      setSelectedKeyword: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      data: null,
      isLoading: true,
      refresh: vi.fn(),
    })
    render(<MarketTrendPage />)
    expect(screen.getByText(/加载中/)).toBeInTheDocument()
  })

  it('renders chart when data available', () => {
    vi.mocked(useMarketTrend).mockReturnValue({
      keywords: ['macbook'],
      selectedKeyword: 'macbook',
      setSelectedKeyword: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      data: {
        keyword: 'macbook',
        days: 30,
        trend: [
          { date: '2026-01-15', avg_price: 9000, median_price: 8800, min_price: 7500, max_price: 11000, count: 15 },
        ],
      },
      isLoading: false,
      refresh: vi.fn(),
    })
    render(<MarketTrendPage />)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('renders time range buttons', () => {
    vi.mocked(useMarketTrend).mockReturnValue({
      keywords: ['macbook'],
      selectedKeyword: 'macbook',
      setSelectedKeyword: vi.fn(),
      days: 30,
      setDays: vi.fn(),
      data: null,
      isLoading: false,
      refresh: vi.fn(),
    })
    render(<MarketTrendPage />)
    expect(screen.getByText('30天')).toBeInTheDocument()
    expect(screen.getByText('60天')).toBeInTheDocument()
    expect(screen.getByText('90天')).toBeInTheDocument()
  })
})

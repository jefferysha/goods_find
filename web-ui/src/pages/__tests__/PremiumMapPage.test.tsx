import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import PremiumMapPage from '../PremiumMapPage'

// Mock the hook
vi.mock('@/hooks/premiumMap/usePremiumMap', () => ({
  usePremiumMap: vi.fn(),
}))

// Mock recharts to avoid canvas issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
}))

import { usePremiumMap } from '@/hooks/premiumMap/usePremiumMap'

const mockCategories = [
  {
    id: '1',
    category_name: 'MacBook Pro M2',
    keywords: ['macbook pro m2'],
    total_items: 23,
    market_price: 9500,
    median_price: 8200,
    avg_premium_rate: -13.7,
    good_deal_count: 5,
    purchase_range: [6870, 7870] as [number | null, number | null],
    new_price: 14999,
  },
]

describe('PremiumMapPage', () => {
  beforeEach(() => {
    vi.mocked(usePremiumMap).mockReturnValue({
      categories: [],
      selectedKeyword: null,
      setSelectedKeyword: vi.fn(),
      distribution: null,
      isLoading: false,
      isDistLoading: false,
      refresh: vi.fn(),
    })
  })

  it('renders page title', () => {
    render(<PremiumMapPage />)
    expect(screen.getByText('溢价地图')).toBeInTheDocument()
  })

  it('shows empty state when no categories', () => {
    render(<PremiumMapPage />)
    expect(screen.getByText(/暂无价格本数据/)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(usePremiumMap).mockReturnValue({
      categories: [],
      selectedKeyword: null,
      setSelectedKeyword: vi.fn(),
      distribution: null,
      isLoading: true,
      isDistLoading: false,
      refresh: vi.fn(),
    })
    render(<PremiumMapPage />)
    expect(screen.getByText(/加载中/)).toBeInTheDocument()
  })

  it('renders category cards', () => {
    vi.mocked(usePremiumMap).mockReturnValue({
      categories: mockCategories,
      selectedKeyword: null,
      setSelectedKeyword: vi.fn(),
      distribution: null,
      isLoading: false,
      isDistLoading: false,
      refresh: vi.fn(),
    })
    render(<PremiumMapPage />)
    expect(screen.getByText('MacBook Pro M2')).toBeInTheDocument()
    expect(screen.getByText(/23/)).toBeInTheDocument()
  })

  it('shows distribution chart when category selected', () => {
    vi.mocked(usePremiumMap).mockReturnValue({
      categories: mockCategories,
      selectedKeyword: 'macbook pro m2',
      setSelectedKeyword: vi.fn(),
      distribution: {
        bins: [{ range_low: 7000, range_high: 8000, count: 5, label: '¥7000-8000' }],
        reference_lines: { market_price: 9500 },
      },
      isLoading: false,
      isDistLoading: false,
      refresh: vi.fn(),
    })
    render(<PremiumMapPage />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})

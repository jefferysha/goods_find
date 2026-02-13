import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import CompetitorPage from '../CompetitorPage'

vi.mock('@/hooks/competitor/useCompetitor', () => ({
  useCompetitor: vi.fn(),
}))

import { useCompetitor } from '@/hooks/competitor/useCompetitor'

const mockData = {
  keyword: '科比手办',
  total_sellers: 3,
  total_items: 15,
  sellers: [
    {
      seller_name: '卖家A',
      item_count: 8,
      avg_price: 150,
      min_price: 100,
      max_price: 200,
      items: [{ title: '科比手办限量版', price: 150, item_link: 'http://example.com', crawl_time: '2026-01-01' }],
    },
  ],
  price_stats: { avg: 150, min: 80, max: 300 },
}

describe('CompetitorPage', () => {
  beforeEach(() => {
    vi.mocked(useCompetitor).mockReturnValue({
      keywords: [],
      selectedKeyword: null,
      setSelectedKeyword: vi.fn(),
      data: null,
      isLoading: false,
      refresh: vi.fn(),
    })
  })

  it('renders page title', () => {
    render(<CompetitorPage />)
    expect(screen.getByText('竞品观察')).toBeInTheDocument()
  })

  it('shows empty state when no keywords', () => {
    render(<CompetitorPage />)
    expect(screen.getByText(/暂无数据/)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useCompetitor).mockReturnValue({
      keywords: ['科比手办'],
      selectedKeyword: '科比手办',
      setSelectedKeyword: vi.fn(),
      data: null,
      isLoading: true,
      refresh: vi.fn(),
    })
    render(<CompetitorPage />)
    expect(screen.getByText(/加载中/)).toBeInTheDocument()
  })

  it('renders seller table when data available', () => {
    vi.mocked(useCompetitor).mockReturnValue({
      keywords: ['科比手办'],
      selectedKeyword: '科比手办',
      setSelectedKeyword: vi.fn(),
      data: mockData,
      isLoading: false,
      refresh: vi.fn(),
    })
    render(<CompetitorPage />)
    expect(screen.getByText('卖家A')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('renders stats cards when data available', () => {
    vi.mocked(useCompetitor).mockReturnValue({
      keywords: ['科比手办'],
      selectedKeyword: '科比手办',
      setSelectedKeyword: vi.fn(),
      data: mockData,
      isLoading: false,
      refresh: vi.fn(),
    })
    render(<CompetitorPage />)
    expect(screen.getByText('3')).toBeInTheDocument()  // total_sellers
    expect(screen.getByText('15')).toBeInTheDocument()  // total_items
  })
})

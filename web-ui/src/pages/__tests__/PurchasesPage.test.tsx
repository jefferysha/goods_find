import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import PurchasesPage from '../PurchasesPage'

vi.mock('@/hooks/purchases/usePurchases', () => ({
  usePurchases: vi.fn(),
}))

import { usePurchases } from '@/hooks/purchases/usePurchases'

const baseReturn = {
  items: [],
  stats: null,
  isLoading: false,
  filters: { status: undefined },
  setFilters: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  markPurchased: vi.fn(),
  batchAssign: vi.fn(),
  refresh: vi.fn(),
}

describe('PurchasesPage', () => {
  beforeEach(() => {
    vi.mocked(usePurchases).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<PurchasesPage />)
    expect(screen.getByText('采购清单')).toBeInTheDocument()
  })

  it('shows empty state when items is empty', () => {
    render(<PurchasesPage />)
    expect(screen.getByText('暂无采购数据')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(usePurchases).mockReturnValue({
      ...baseReturn,
      isLoading: true,
    })
    render(<PurchasesPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders item title when data exists', () => {
    vi.mocked(usePurchases).mockReturnValue({
      ...baseReturn,
      items: [
        {
          id: 1,
          title: 'MacBook Pro 14寸 M3',
          keyword: 'macbook pro',
          price: 8500,
          estimated_profit: 1200,
          estimated_profit_rate: 0.14,
          platform: 'xianyu',
          status: 'new' as const,
          assignee: '',
          image_url: '',
          item_link: '',
          purchase_range_low: null,
          purchase_range_high: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    render(<PurchasesPage />)
    expect(screen.getByText('MacBook Pro 14寸 M3')).toBeInTheDocument()
  })

  it('renders stats cards when stats exist', () => {
    vi.mocked(usePurchases).mockReturnValue({
      ...baseReturn,
      stats: {
        total: 10,
        by_status: { new: 3, contacting: 2, negotiating: 1, purchased: 3, abandoned: 1 },
      },
    })
    render(<PurchasesPage />)
    // Status labels appear in both Card titles and StatusBadge inside cards
    expect(screen.getAllByText('新发现').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('联系中').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('议价中').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('已收货').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('已放弃').length).toBeGreaterThanOrEqual(1)
  })

  it('renders refresh button', () => {
    render(<PurchasesPage />)
    expect(screen.getByText('刷新')).toBeInTheDocument()
  })
})

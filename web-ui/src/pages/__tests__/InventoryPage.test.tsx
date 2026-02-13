import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import InventoryPage from '../InventoryPage'

vi.mock('@/hooks/inventory/useInventory', () => ({
  useInventory: vi.fn(),
}))

import { useInventory } from '@/hooks/inventory/useInventory'

const baseReturn = {
  items: [],
  summary: null,
  agingAlerts: [],
  isLoading: false,
  filters: { status: undefined },
  setFilters: vi.fn(),
  markSold: vi.fn(),
  deleteItem: vi.fn(),
  refresh: vi.fn(),
}

describe('InventoryPage', () => {
  beforeEach(() => {
    vi.mocked(useInventory).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<InventoryPage />)
    expect(screen.getByText('库存台账')).toBeInTheDocument()
  })

  it('shows empty state when items is empty', () => {
    render(<InventoryPage />)
    expect(screen.getByText('暂无库存数据')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useInventory).mockReturnValue({
      ...baseReturn,
      isLoading: true,
    })
    render(<InventoryPage />)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })

  it('renders summary cards when summary exists', () => {
    vi.mocked(useInventory).mockReturnValue({
      ...baseReturn,
      summary: {
        total_count: 15,
        total_cost: 50000,
        estimated_value: 72000,
        by_status: { in_stock: 5, refurbishing: 3, listed: 4, sold: 2, returned: 1 },
      },
    })
    render(<InventoryPage />)
    expect(screen.getByText('总库存件数')).toBeInTheDocument()
    // "总成本" appears in both summary card and table header
    expect(screen.getAllByText('总成本').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('预估总货值')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('renders item when data exists', () => {
    vi.mocked(useInventory).mockReturnValue({
      ...baseReturn,
      items: [
        {
          id: 1,
          title: 'iPad Pro 11寸',
          keyword: 'ipad pro',
          platform: 'xianyu',
          status: 'in_stock' as const,
          purchase_price: 3200,
          total_cost: 3300,
          shipping_fee: 30,
          refurbish_fee: 50,
          platform_fee: 20,
          other_fee: 0,
          listing_price: null,
          aging_days: 3,
          assignee: '小张',
          created_at: '2026-01-10T00:00:00Z',
        },
      ],
    })
    render(<InventoryPage />)
    expect(screen.getByText('iPad Pro 11寸')).toBeInTheDocument()
  })

  it('renders aging alerts when present', () => {
    vi.mocked(useInventory).mockReturnValue({
      ...baseReturn,
      agingAlerts: [
        { id: 1, title: '旧款MacBook', aging_days: 12, total_cost: 4000 },
      ],
    })
    render(<InventoryPage />)
    expect(screen.getByText('库龄预警（超过7天）')).toBeInTheDocument()
    expect(screen.getByText('旧款MacBook')).toBeInTheDocument()
  })
})

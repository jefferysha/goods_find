import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import PriceBookPage from '../PriceBookPage'

vi.mock('@/hooks/priceBook/usePriceBook', () => ({
  usePriceBook: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/lib/platforms', () => ({
  getPlatformName: (p: string) => p,
}))

import { usePriceBook } from '@/hooks/priceBook/usePriceBook'

const baseReturn = {
  entries: [],
  isLoading: false,
  error: null,
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  autoUpdatePrices: vi.fn(),
}

describe('PriceBookPage', () => {
  beforeEach(() => {
    vi.mocked(usePriceBook).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<PriceBookPage />)
    expect(screen.getByText('价格本')).toBeInTheDocument()
  })

  it('shows empty state when entries is empty', () => {
    render(<PriceBookPage />)
    expect(screen.getByText('暂无品类，点击「新建品类」开始')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(usePriceBook).mockReturnValue({
      ...baseReturn,
      isLoading: true,
    })
    render(<PriceBookPage />)
    expect(screen.getByText('正在加载中...')).toBeInTheDocument()
  })

  it('renders category name when entries exist', () => {
    vi.mocked(usePriceBook).mockReturnValue({
      ...baseReturn,
      entries: [
        {
          id: '1',
          category_name: 'MacBook Air M2',
          keywords: ['macbook', 'mba'],
          platform: 'xianyu',
          new_price: 8999,
          market_price: 5000,
          market_price_source: 'manual' as const,
          target_sell_price: 5500,
          fees: { shipping_fee: 20, refurbish_fee: 50, platform_fee_rate: 0.05, other_fee: 0 },
          min_profit_rate: 0.15,
          ideal_profit_rate: 0.25,
          note: '',
        },
      ],
    })
    render(<PriceBookPage />)
    expect(screen.getByText('MacBook Air M2')).toBeInTheDocument()
  })

  it('renders "新建品类" button', () => {
    render(<PriceBookPage />)
    expect(screen.getByText('新建品类')).toBeInTheDocument()
  })

  it('shows entry count', () => {
    render(<PriceBookPage />)
    expect(screen.getByText('共 0 个品类')).toBeInTheDocument()
  })
})

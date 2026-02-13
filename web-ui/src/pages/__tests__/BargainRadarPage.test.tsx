import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import BargainRadarPage from '../BargainRadarPage'

vi.mock('@/hooks/bargainRadar/useBargainRadar', () => ({
  useBargainRadar: vi.fn(),
}))

// Mock Select components to avoid Radix UI error with empty string value
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}))

import { useBargainRadar } from '@/hooks/bargainRadar/useBargainRadar'

const baseReturn = {
  items: [],
  keywords: [],
  summary: {
    totalCount: 0,
    profitableCount: 0,
    estimatedTotalProfit: 0,
    averageProfitRate: null,
  },
  filters: {
    keyword: '',
    status: 'all' as const,
    sortBy: 'profit_rate' as const,
    aiRecommendedOnly: false,
  },
  setFilters: vi.fn(),
  isLoading: false,
  addingIds: new Set<string>(),
  refresh: vi.fn(),
  addToPurchase: vi.fn(),
}

describe('BargainRadarPage', () => {
  beforeEach(() => {
    vi.mocked(useBargainRadar).mockReturnValue(baseReturn)
  })

  it('renders page title', () => {
    render(<BargainRadarPage />)
    expect(screen.getByText('捡漏雷达')).toBeInTheDocument()
  })

  it('shows empty state when items is empty', () => {
    render(<BargainRadarPage />)
    expect(screen.getByText('暂无商品数据')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useBargainRadar).mockReturnValue({
      ...baseReturn,
      isLoading: true,
    })
    render(<BargainRadarPage />)
    expect(screen.getByText('正在扫描全部商品并评估利润...')).toBeInTheDocument()
  })

  it('renders summary stat cards', () => {
    vi.mocked(useBargainRadar).mockReturnValue({
      ...baseReturn,
      summary: {
        totalCount: 128,
        profitableCount: 35,
        estimatedTotalProfit: 28000,
        averageProfitRate: 0.22,
      },
    })
    render(<BargainRadarPage />)
    expect(screen.getByText('今日商品总数')).toBeInTheDocument()
    expect(screen.getByText('可收商品数量')).toBeInTheDocument()
    expect(screen.getByText('预估总利润')).toBeInTheDocument()
    expect(screen.getByText('平均利润率')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('35')).toBeInTheDocument()
  })

  it('renders bargain table when items exist', () => {
    vi.mocked(useBargainRadar).mockReturnValue({
      ...baseReturn,
      items: [
        {
          item: {
            商品信息: {
              商品ID: 'item-001',
              商品标题: 'MacBook Air M2 全新未拆',
              当前售价: '¥4200',
              商品链接: 'https://example.com/item-001',
            },
            搜索关键字: 'MacBook Air M2',
            platform: '闲鱼',
            ai_analysis: { is_recommended: true },
          },
          evaluation: {
            status: 'great_deal',
            purchase_range: [3800, 4300],
            profit: 800,
            profit_rate: 0.19,
          },
        },
      ],
    })
    render(<BargainRadarPage />)
    expect(screen.getByText('MacBook Air M2 全新未拆')).toBeInTheDocument()
    // "超值捡漏" appears in both filter SelectItem and StatusBadge
    expect(screen.getAllByText('超值捡漏').length).toBeGreaterThanOrEqual(1)
  })

  it('renders refresh button', () => {
    render(<BargainRadarPage />)
    expect(screen.getByText('刷新扫描')).toBeInTheDocument()
  })
})

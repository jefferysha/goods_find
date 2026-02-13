import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import ResultsPage from '../ResultsPage'

vi.mock('@/hooks/results/useResults', () => ({
  useResults: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/api/purchases', () => ({
  createPurchase: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/api/pricing', () => ({
  createMarketPrice: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/platforms', () => ({
  getAllPlatforms: () => [{ id: 'xianyu', name: '闲鱼', color: '#FFE400', enabled: true }],
  getPlatform: (id: string) => ({ id, name: '闲鱼', color: '#FFE400', enabled: true }),
  getPlatformColor: () => '#FFE400',
}))

import { useResults } from '@/hooks/results/useResults'

const baseHookReturn = {
  keywords: ['test'],
  selectedKeyword: 'test',
  setSelectedKeyword: vi.fn(),
  results: [],
  filters: { recommended_only: false, sort_by: 'crawl_time' as const, sort_order: 'desc' as const },
  setFilters: vi.fn(),
  isLoading: false,
  error: null,
  refreshResults: vi.fn(),
  deleteSelected: vi.fn(),
  exportCsv: vi.fn(),
  keywordOptions: [{ value: 'test', label: 'test (10条)' }],
  isOptionsReady: true,
}

const mockItem = {
  商品信息: {
    商品ID: '123',
    商品标题: '测试商品',
    当前售价: '¥100',
    商品链接: 'http://example.com',
    商品主图链接: 'http://img.com/1.jpg',
    发货地区: '北京',
    发布时间: '2026-01-01',
    商品图片列表: [],
    商品标签: [],
  },
  卖家信息: { 卖家昵称: '测试卖家' },
  ai_analysis: { is_recommended: true, reason: '好商品', risk_tags: [] },
  platform: 'xianyu',
  搜索关键字: 'test',
  爬取时间: '2026-01-01T00:00:00',
}

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.mocked(useResults).mockReturnValue(baseHookReturn as any)
  })

  it('renders page title', () => {
    render(<ResultsPage />)
    expect(screen.getByText('结果查看')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(<ResultsPage />)
    expect(screen.getByText(/没有找到符合条件的商品/)).toBeInTheDocument()
  })

  it('renders results in grid view', () => {
    vi.mocked(useResults).mockReturnValue({
      ...baseHookReturn,
      results: [mockItem],
    } as any)
    render(<ResultsPage />)
    expect(screen.getByText('测试商品')).toBeInTheDocument()
  })
})

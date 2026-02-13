import { useState, useCallback, useMemo } from 'react'
import {
  fetchBargainItems,
  addToPurchaseList,
  type BargainItem,
  type BargainSummary,
} from '@/api/bargainRadar'
import { useToast } from '@/hooks/use-toast'

export type BargainStatus = 'all' | 'great_deal' | 'good_deal' | 'overpriced' | 'no_config'
export type BargainSortBy = 'profit_rate' | 'profit' | 'crawl_time'

export interface BargainFilters {
  keyword: string        // '' = 全部
  status: BargainStatus
  sortBy: BargainSortBy
  aiRecommendedOnly: boolean
}

export function useBargainRadar() {
  const [allItems, setAllItems] = useState<BargainItem[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [summary, setSummary] = useState<BargainSummary>({
    totalCount: 0,
    profitableCount: 0,
    estimatedTotalProfit: 0,
    averageProfitRate: 0,
  })
  const [filters, setFilters] = useState<BargainFilters>({
    keyword: '',
    status: 'all',
    sortBy: 'profit_rate',
    aiRecommendedOnly: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchBargainItems(
        filters.keyword || undefined,
        filters.status,
        filters.sortBy,
        filters.aiRecommendedOnly
      )
      setAllItems(data.items)
      setKeywords(data.keywords)
      setSummary(data.summary)
    } catch (e) {
      toast({
        title: '加载失败',
        description: (e as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters, toast])

  // 直接使用后端返回的数据，不需要前端再筛选
  const items = allItems

  // 加入采购清单
  const addToPurchase = useCallback(
    async (bargainItem: BargainItem) => {
      const info = bargainItem.item.商品信息
      const itemId = info.商品ID
      setAddingIds((prev) => new Set(prev).add(itemId))
      try {
        const price =
          parseFloat(
            String(info.当前售价).replace('¥', '').replace(',', '').trim(),
          ) || 0
        await addToPurchaseList({
          item_id: itemId,
          title: info.商品标题,
          price,
          image_url: info.商品图片列表?.[0] || info.商品主图链接,
          item_link: info.商品链接,
          platform: bargainItem.item.platform || 'xianyu',
          keyword: bargainItem.item.搜索关键字 || '',
          estimated_profit: bargainItem.evaluation.profit ?? undefined,
          estimated_profit_rate: bargainItem.evaluation.profit_rate ?? undefined,
          purchase_range_low: bargainItem.evaluation.purchase_range?.[0] ?? undefined,
          purchase_range_high: bargainItem.evaluation.purchase_range?.[1] ?? undefined,
        })
        toast({ title: '已加入采购清单' })
      } catch (e) {
        toast({
          title: '加入失败',
          description: (e as Error).message,
          variant: 'destructive',
        })
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }
    },
    [toast],
  )

  return {
    items,
    allItems,
    keywords,
    summary,
    filters,
    setFilters,
    isLoading,
    addingIds,
    refresh,
    addToPurchase,
  }
}

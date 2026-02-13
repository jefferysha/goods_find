import type { ResultItem } from '@/types/result'
import { http } from './http'

/** 评估结果 */
export interface EvaluationResult {
  status: 'great_deal' | 'good_deal' | 'overpriced' | 'no_config'
  purchase_range: [number | null, number | null]
  profit: number | null
  profit_rate: number | null
  total_cost: number | null
  total_fees: number | null
  market_diff_pct: number | null
}

/** 带评估信息的商品 */
export interface BargainItem {
  item: ResultItem
  evaluation: EvaluationResult
}

/** 汇总信息 */
export interface BargainSummary {
  totalCount: number
  profitableCount: number
  estimatedTotalProfit: number
  averageProfitRate: number
}

/**
 * 捡漏雷达 - 直接从数据库读取已评估的商品
 */
export async function fetchBargainItems(
  keyword?: string,
  status?: string,
  sortBy?: string,
  aiRecommendedOnly?: boolean
): Promise<{
  items: BargainItem[]
  keywords: string[]
  summary: BargainSummary
}> {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (status && status !== 'all') params.set('status', status)
  if (sortBy) params.set('sort_by', sortBy)
  if (aiRecommendedOnly) params.set('ai_recommended_only', 'true')
  
  const data = await http(`/api/bargain-radar/items?${params}`)
  
  // 转换为 BargainItem 格式
  const items: BargainItem[] = (data.items || []).map((item: any) => ({
    item: item as ResultItem,
    evaluation: {
      status: item.evaluation_status || 'no_config',
      purchase_range: [item.purchase_range_low, item.purchase_range_high],
      profit: item.estimated_profit,
      profit_rate: item.estimated_profit_rate,
      total_cost: null,
      total_fees: null,
      market_diff_pct: item.premium_rate ? item.premium_rate * 100 : null,
    }
  }))
  
  return {
    items,
    keywords: data.keywords || [],
    summary: data.summary || {
      totalCount: 0,
      profitableCount: 0,
      estimatedTotalProfit: 0,
      averageProfitRate: 0
    }
  }
}

/** 加入采购清单 */
export async function addToPurchaseList(data: {
  item_id: string
  title: string
  price: number
  image_url?: string
  item_link?: string
  platform: string
  keyword: string
  estimated_profit?: number
  estimated_profit_rate?: number
  purchase_range_low?: number
  purchase_range_high?: number
}) {
  return await http('/api/purchases/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

import { http } from './http'

// ── 类型定义 ────────────────────────────────────────

export interface PlatformStats {
  platform: string
  currency: string
  item_count: number
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  converted_avg: number
  converted_min: number
}

export interface CategoryComparison {
  category_id: string
  category_name: string
  platforms: PlatformStats[]
  price_gap_pct: number
  arbitrage_opportunity: 'high' | 'medium' | 'low' | 'none'
  cheapest_platform: string
  keywords: Record<string, string>
}

export interface CrossPlatformItem {
  item_id: string
  title: string
  platform: string
  price: number
  currency: string
  converted_price: number
  vs_category_avg: number
  vs_cheapest: number
  image_url: string
  item_link: string
  seller_credit: string
  ai_recommended: boolean
  keyword: string
}

export interface KeywordMapping {
  id: number
  keyword: string
  platform: string
  category_id: string
  category_name: string
}

export type ExchangeRates = Record<string, number>

// ── API 调用 ────────────────────────────────────────

export async function getComparableCategories(): Promise<CategoryComparison[]> {
  return http('/api/cross-platform/categories')
}

export async function getCategoryDetail(categoryId: string): Promise<CategoryComparison> {
  return http(`/api/cross-platform/categories/${categoryId}`)
}

export async function getCrossPlatformItems(params?: {
  category_id?: string
  sort_by?: string
  platforms?: string
  limit?: number
}): Promise<CrossPlatformItem[]> {
  return http('/api/cross-platform/items', { params: params as Record<string, any> })
}

export async function getExchangeRates(): Promise<ExchangeRates> {
  return http('/api/cross-platform/exchange-rates')
}

export async function updateExchangeRates(rates: { from: string; to: string; rate: number }[]): Promise<void> {
  await http('/api/cross-platform/exchange-rates', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rates }),
  })
}

export async function getKeywordMappings(): Promise<KeywordMapping[]> {
  return http('/api/cross-platform/keyword-mappings')
}

export async function createKeywordMapping(data: {
  keyword: string
  platform: string
  category_id: string
}): Promise<void> {
  await http('/api/cross-platform/keyword-mappings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteKeywordMapping(mappingId: number): Promise<void> {
  await http(`/api/cross-platform/keyword-mappings/${mappingId}`, { method: 'DELETE' })
}

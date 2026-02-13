import type { PriceBookEntry } from '@/types/priceBook'
import { http } from './http'

/** 获取所有价格本条目 */
export async function getAllEntries(): Promise<PriceBookEntry[]> {
  return await http('/api/price-book/entries')
}

/** 获取单个价格本条目 */
export async function getEntry(entryId: string): Promise<PriceBookEntry> {
  return await http(`/api/price-book/entries/${entryId}`)
}

/** 关键词匹配价格本条目 */
export async function matchKeyword(keyword: string): Promise<PriceBookEntry | null> {
  return await http('/api/price-book/match', { params: { keyword } })
}

/** 创建价格本条目 */
export async function createEntry(data: Partial<PriceBookEntry>): Promise<{ message: string; data: PriceBookEntry }> {
  return await http('/api/price-book/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/** 更新价格本条目 */
export async function updateEntry(entryId: string, data: Partial<PriceBookEntry>): Promise<{ message: string; data: PriceBookEntry }> {
  return await http(`/api/price-book/entries/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/** 删除价格本条目 */
export async function deleteEntry(entryId: string): Promise<{ message: string }> {
  return await http(`/api/price-book/entries/${entryId}`, { method: 'DELETE' })
}

/** 批量更新价格本条目 */
export async function batchUpdate(ids: string[], data: Record<string, unknown>): Promise<{ message: string; count: number }> {
  return await http('/api/price-book/batch-update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, ...data }),
  })
}

/** 单品评估 */
export async function evaluate(keyword: string, price: number): Promise<Record<string, unknown>> {
  return await http('/api/price-book/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, price }),
  })
}

/** 批量评估 */
export async function evaluateBatch(items: { keyword: string; price: number }[]): Promise<Record<string, unknown>[]> {
  return await http('/api/price-book/evaluate-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
}

/** 自动更新行情价 */
export async function autoUpdateMarketPrices(): Promise<{ message: string }> {
  return await http('/api/price-book/auto-update-market-prices', {
    method: 'POST',
  })
}

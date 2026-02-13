import { http } from './http'
import type { PriceHistory } from '@/types/history'

export async function fetchPriceHistory(itemId: string): Promise<PriceHistory> {
  return http(`/api/history/${itemId}`)
}

export async function fetchPriceHistoryBatch(itemIds: string[]): Promise<PriceHistory[]> {
  return http('/api/history/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds }),
  })
}

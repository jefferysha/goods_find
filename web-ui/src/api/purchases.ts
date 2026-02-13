import { http } from './http'
import type { PurchaseItem, PurchaseStats, PurchaseFilters } from '@/types/purchase'

export async function getPurchaseList(filters?: PurchaseFilters): Promise<PurchaseItem[]> {
  return http('/api/purchases/', { params: filters as Record<string, any> })
}

export async function getPurchaseStats(): Promise<PurchaseStats> {
  return http('/api/purchases/stats')
}

export async function getPurchaseById(itemId: number): Promise<PurchaseItem> {
  return http(`/api/purchases/${itemId}`)
}

export async function createPurchase(data: Partial<PurchaseItem>): Promise<PurchaseItem> {
  return http('/api/purchases/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updatePurchase(itemId: number, data: Partial<PurchaseItem>): Promise<PurchaseItem> {
  return http(`/api/purchases/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deletePurchase(itemId: number): Promise<void> {
  await http(`/api/purchases/${itemId}`, { method: 'DELETE' })
}

export async function batchAssign(ids: number[], assignee: string): Promise<void> {
  await http('/api/purchases/batch-assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, assignee }),
  })
}

export async function markPurchased(itemId: number, actualPrice: number): Promise<PurchaseItem> {
  return http(`/api/purchases/${itemId}/mark-purchased`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actual_price: actualPrice }),
  })
}

import { http } from './http'
import type { InventoryItem, InventorySummary, AgingAlert, InventoryFilters } from '@/types/inventory'

export async function getInventoryList(filters?: InventoryFilters): Promise<InventoryItem[]> {
  return http('/api/inventory/', { params: filters as Record<string, any> })
}

export async function getInventorySummary(assignee?: string): Promise<InventorySummary> {
  return http('/api/inventory/summary', { params: { assignee } })
}

export async function getAgingAlerts(days?: number, assignee?: string): Promise<AgingAlert[]> {
  return http('/api/inventory/aging-alerts', { params: { days, assignee } })
}

export async function getInventoryById(itemId: number): Promise<InventoryItem> {
  return http(`/api/inventory/${itemId}`)
}

export async function createInventory(data: Partial<InventoryItem>): Promise<InventoryItem> {
  return http('/api/inventory/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateInventory(itemId: number, data: Partial<InventoryItem>): Promise<InventoryItem> {
  return http(`/api/inventory/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function markSold(itemId: number, soldPrice: number, soldChannel: string): Promise<InventoryItem> {
  return http(`/api/inventory/${itemId}/mark-sold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sold_price: soldPrice, sold_channel: soldChannel }),
  })
}

export async function deleteInventory(itemId: number): Promise<void> {
  await http(`/api/inventory/${itemId}`, { method: 'DELETE' })
}

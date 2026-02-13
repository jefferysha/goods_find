import { useState, useCallback } from 'react'
import {
  getInventoryList,
  getInventorySummary,
  getAgingAlerts,
  createInventory,
  updateInventory,
  markSold as markSoldApi,
  deleteInventory,
} from '@/api/inventory'
import type { InventoryItem, InventorySummary, AgingAlert, InventoryFilters } from '@/types/inventory'

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [agingAlerts, setAgingAlerts] = useState<AgingAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InventoryFilters>({})

  const refresh = useCallback(async (overrideFilters?: InventoryFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const activeFilters = overrideFilters ?? filters
      const [list, summaryData, alerts] = await Promise.all([
        getInventoryList(activeFilters),
        getInventorySummary(activeFilters.assignee),
        getAgingAlerts(7, activeFilters.assignee),
      ])
      setItems(Array.isArray(list) ? list : [])
      setSummary(summaryData)
      setAgingAlerts(Array.isArray(alerts) ? alerts : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载库存列表失败')
      console.error('Failed to load inventory', e)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const createItem = useCallback(async (data: Partial<InventoryItem>) => {
    await createInventory(data)
    await refresh()
  }, [refresh])

  const updateItem = useCallback(async (itemId: number, data: Partial<InventoryItem>) => {
    await updateInventory(itemId, data)
    await refresh()
  }, [refresh])

  const markSold = useCallback(async (itemId: number, soldPrice: number, soldChannel: string) => {
    await markSoldApi(itemId, soldPrice, soldChannel)
    await refresh()
  }, [refresh])

  const deleteItem = useCallback(async (itemId: number) => {
    await deleteInventory(itemId)
    await refresh()
  }, [refresh])

  return {
    items,
    summary,
    agingAlerts,
    isLoading,
    error,
    filters,
    setFilters,
    createItem,
    updateItem,
    markSold,
    deleteItem,
    refresh,
  }
}

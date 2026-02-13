import { useState, useCallback } from 'react'
import {
  getPurchaseList,
  getPurchaseStats,
  createPurchase,
  updatePurchase,
  deletePurchase,
  batchAssign as batchAssignApi,
  markPurchased as markPurchasedApi,
} from '@/api/purchases'
import type { PurchaseItem, PurchaseStats, PurchaseFilters } from '@/types/purchase'

export function usePurchases() {
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [stats, setStats] = useState<PurchaseStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PurchaseFilters>({})

  const refresh = useCallback(async (overrideFilters?: PurchaseFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const activeFilters = overrideFilters ?? filters
      const [list, statsData] = await Promise.all([
        getPurchaseList(activeFilters),
        getPurchaseStats(),
      ])
      setItems(Array.isArray(list) ? list : [])
      setStats(statsData)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载采购列表失败')
      console.error('Failed to load purchases', e)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const createItem = useCallback(async (data: Partial<PurchaseItem>) => {
    await createPurchase(data)
    await refresh()
  }, [refresh])

  const updateItem = useCallback(async (itemId: number, data: Partial<PurchaseItem>) => {
    await updatePurchase(itemId, data)
    await refresh()
  }, [refresh])

  const deleteItem = useCallback(async (itemId: number) => {
    await deletePurchase(itemId)
    await refresh()
  }, [refresh])

  const markPurchased = useCallback(async (itemId: number, actualPrice: number) => {
    await markPurchasedApi(itemId, actualPrice)
    await refresh()
  }, [refresh])

  const batchAssign = useCallback(async (ids: number[], assignee: string) => {
    await batchAssignApi(ids, assignee)
    await refresh()
  }, [refresh])

  return {
    items,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    createItem,
    updateItem,
    deleteItem,
    markPurchased,
    batchAssign,
    refresh,
  }
}

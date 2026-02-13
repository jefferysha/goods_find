import { useState, useCallback } from 'react'
import {
  fetchMarketPrices,
  createMarketPrice,
  updateMarketPrice,
  deleteMarketPrice,
} from '@/api/pricing'
import type { MarketPrice } from '@/types/pricing'

export function useMarketPrice(taskId: number) {
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMarketPrices(taskId)
      setPrices(data)
    } catch (e) {
      console.error('Failed to load market prices', e)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const add = useCallback(
    async (data: Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'>) => {
      await createMarketPrice(data)
      await load()
    },
    [load],
  )

  const update = useCallback(
    async (id: string, data: Partial<MarketPrice>) => {
      await updateMarketPrice(id, data)
      await load()
    },
    [load],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteMarketPrice(id)
      await load()
    },
    [load],
  )

  return { prices, loading, load, add, update, remove }
}

import { useState, useCallback } from 'react'
import { fetchPriceHistory } from '@/api/history'
import type { PriceHistory } from '@/types/history'

export function useHistory() {
  const [history, setHistory] = useState<PriceHistory | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (itemId: string) => {
    setLoading(true)
    try {
      setHistory(await fetchPriceHistory(itemId))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  return { history, loading, load }
}

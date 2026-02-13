import { useState, useEffect, useCallback } from 'react'
import { getMarketTrend, type MarketTrendResponse } from '@/api/marketTrend'
import { getKeywords } from '@/api/results'

export function useMarketTrend() {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [data, setData] = useState<MarketTrendResponse | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await getKeywords()
      const list = Array.isArray(res) ? res : []
      setKeywords(list)
      if (!selectedKeyword && list.length > 0) setSelectedKeyword(list[0])
    } catch (e) { console.error(e) }
  }, [])

  const fetchTrend = useCallback(async () => {
    if (!selectedKeyword) return
    setIsLoading(true)
    try {
      const result = await getMarketTrend(selectedKeyword, days)
      setData(result)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [selectedKeyword, days])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])
  useEffect(() => { fetchTrend() }, [fetchTrend])

  return { keywords, selectedKeyword, setSelectedKeyword, days, setDays, data, isLoading, refresh: fetchTrend }
}

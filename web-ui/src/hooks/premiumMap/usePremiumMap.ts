import { useState, useEffect, useCallback } from 'react'
import * as api from '@/api/premiumMap'
import type { CategoryOverview, DistributionData } from '@/api/premiumMap'

export function usePremiumMap() {
  const [categories, setCategories] = useState<CategoryOverview[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [distribution, setDistribution] = useState<DistributionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDistLoading, setIsDistLoading] = useState(false)

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getPremiumMapOverview()
      setCategories(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDistribution = useCallback(async (keyword: string) => {
    setIsDistLoading(true)
    try {
      const data = await api.getPremiumDistribution(keyword)
      setDistribution(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsDistLoading(false)
    }
  }, [])

  useEffect(() => { fetchOverview() }, [fetchOverview])

  useEffect(() => {
    if (selectedKeyword) fetchDistribution(selectedKeyword)
    else setDistribution(null)
  }, [selectedKeyword, fetchDistribution])

  return { categories, selectedKeyword, setSelectedKeyword, distribution, isLoading, isDistLoading, refresh: fetchOverview }
}

import { useState, useEffect, useCallback } from 'react'
import { getCompetitorAnalysis, type CompetitorAnalysis } from '@/api/competitor'
import { getKeywords } from '@/api/results'

export function useCompetitor() {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [data, setData] = useState<CompetitorAnalysis | null>(null)
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

  const fetchData = useCallback(async () => {
    if (!selectedKeyword) return
    setIsLoading(true)
    try {
      const result = await getCompetitorAnalysis(selectedKeyword)
      setData(result)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [selectedKeyword])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])
  useEffect(() => { fetchData() }, [fetchData])

  return { keywords, selectedKeyword, setSelectedKeyword, data, isLoading, refresh: fetchData }
}

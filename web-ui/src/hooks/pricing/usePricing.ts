import { useState, useCallback } from 'react'
import { fetchPriceAnalysis, fetchBatchStats } from '@/api/pricing'
import type { PriceAnalysis, BatchStats } from '@/types/pricing'

export function usePricing(taskId: number) {
  const [analyses, setAnalyses] = useState<PriceAnalysis[]>([])
  const [batchStats, setBatchStats] = useState<BatchStats | null>(null)
  const [loading, setLoading] = useState(false)

  const loadAnalysis = useCallback(
    async (runId?: string) => {
      setLoading(true)
      try {
        const [analysisData, statsData] = await Promise.all([
          fetchPriceAnalysis(taskId, runId),
          fetchBatchStats(taskId, runId),
        ])
        setAnalyses(analysisData)
        setBatchStats(statsData)
      } catch (e) {
        console.error('Failed to load pricing analysis', e)
      } finally {
        setLoading(false)
      }
    },
    [taskId],
  )

  return { analyses, batchStats, loading, loadAnalysis }
}

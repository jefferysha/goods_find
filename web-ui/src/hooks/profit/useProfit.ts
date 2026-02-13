import { useState, useCallback } from 'react'
import {
  getSaleRecords,
  getProfitSummary,
  getProfitByKeyword,
  getProfitByAssignee,
  getDailyProfit,
} from '@/api/profit'
import type {
  SaleRecord,
  ProfitSummary,
  KeywordProfit,
  AssigneeProfit,
  DailyProfit,
} from '@/types/profit'

export function useProfit() {
  const [records, setRecords] = useState<SaleRecord[]>([])
  const [summary, setSummary] = useState<ProfitSummary | null>(null)
  const [byKeyword, setByKeyword] = useState<KeywordProfit[]>([])
  const [byAssignee, setByAssignee] = useState<AssigneeProfit[]>([])
  const [dailyTrend, setDailyTrend] = useState<DailyProfit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start_date?: string; end_date?: string }>({})

  const refresh = useCallback(async (overrideRange?: { start_date?: string; end_date?: string }) => {
    setIsLoading(true)
    setError(null)
    try {
      const activeRange = overrideRange ?? dateRange
      const filters = { ...activeRange }
      const [recordsData, summaryData, keywordData, assigneeData, trendData] = await Promise.all([
        getSaleRecords(filters),
        getProfitSummary(filters),
        getProfitByKeyword(filters),
        getProfitByAssignee(filters),
        getDailyProfit(30),
      ])
      setRecords(Array.isArray(recordsData) ? recordsData : [])
      setSummary(summaryData)
      setByKeyword(Array.isArray(keywordData) ? keywordData : [])
      setByAssignee(Array.isArray(assigneeData) ? assigneeData : [])
      setDailyTrend(Array.isArray(trendData) ? trendData : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载利润数据失败')
      console.error('Failed to load profit data', e)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  return {
    records,
    summary,
    byKeyword,
    byAssignee,
    dailyTrend,
    isLoading,
    error,
    dateRange,
    setDateRange,
    refresh,
  }
}

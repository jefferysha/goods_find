import { useState, useCallback } from 'react'
import {
  fetchDashboardStats,
  fetchPriceTrend,
  fetchPremiumDistribution,
  fetchTopKeywords,
  fetchBargainLeaderboard,
  fetchProfitSummary,
  fetchDailyProfit,
  fetchInventorySummary,
  fetchAgingAlerts,
  fetchTeamPerformance,
  fetchProfitByKeyword,
} from '@/api/dashboard'
import type { DashboardStats, PriceTrendPoint, BargainItem } from '@/api/dashboard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PremiumDistData = Record<string, any>

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [priceTrend, setPriceTrend] = useState<PriceTrendPoint[]>([])
  const [premiumDist, setPremiumDist] = useState<PremiumDistData>({})
  const [topKeywords, setTopKeywords] = useState<{ keyword: string; count: number }[]>([])
  const [bargainList, setBargainList] = useState<BargainItem[]>([])
  const [profitSummary, setProfitSummary] = useState<any>(null)
  const [dailyProfit, setDailyProfit] = useState<any[]>([])
  const [inventorySummary, setInventorySummary] = useState<any>(null)
  const [agingAlerts, setAgingAlerts] = useState<any[]>([])
  const [teamPerformance, setTeamPerformance] = useState<any[]>([])
  const [profitByKeyword, setProfitByKeyword] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadAll = useCallback(async (taskId?: number) => {
    setLoading(true)
    try {
      const [s, t, d, k, b, ps, dp, is_, aa, tp, pbk] = await Promise.all([
        fetchDashboardStats(),
        taskId ? fetchPriceTrend(taskId) : Promise.resolve([]),
        fetchPremiumDistribution(taskId),
        fetchTopKeywords(),
        fetchBargainLeaderboard(10),
        fetchProfitSummary().catch(() => null),
        fetchDailyProfit(30).catch(() => []),
        fetchInventorySummary().catch(() => null),
        fetchAgingAlerts(14).catch(() => []),
        fetchTeamPerformance().catch(() => []),
        fetchProfitByKeyword().catch(() => []),
      ])
      setStats(s)
      setPriceTrend(Array.isArray(t) ? t : (t as any)?.trend ?? [])
      setPremiumDist(d && typeof d === 'object' ? d : {})
      setTopKeywords(Array.isArray(k) ? k : (k as any)?.keywords ?? [])
      setBargainList(Array.isArray(b) ? b : [])
      setProfitSummary(ps)
      setDailyProfit(Array.isArray(dp) ? dp : (dp as any)?.data ?? [])
      setInventorySummary(is_)
      setAgingAlerts(Array.isArray(aa) ? aa : [])
      setTeamPerformance(Array.isArray(tp) ? tp : (tp as any)?.data ?? [])
      setProfitByKeyword(Array.isArray(pbk) ? pbk : (pbk as any)?.data ?? [])
    } catch (e) {
      console.error('Failed to load dashboard', e)
    } finally {
      setLoading(false)
    }
  }, [])

  return { stats, priceTrend, premiumDist, topKeywords, bargainList, profitSummary, dailyProfit, inventorySummary, agingAlerts, teamPerformance, profitByKeyword, loading, loadAll }
}

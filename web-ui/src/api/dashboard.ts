import { http } from './http'

export interface DashboardStats {
  total_tasks: number
  active_tasks: number
  total_items: number
  low_price_items: number
  high_premium_items: number
  avg_premium_rate: number
  enabled_platforms: number
  total_platforms: number
}

export interface PriceTrendPoint {
  date: string
  avg_price: number
  min_price: number
  max_price: number
  count: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return http('/api/dashboard/stats')
}

export async function fetchPriceTrend(taskId: number, days?: number): Promise<PriceTrendPoint[]> {
  return http('/api/dashboard/price-trend', { params: { task_id: taskId, days: days || 30 } })
}

export async function fetchPremiumDistribution(taskId?: number) {
  return http('/api/dashboard/premium-distribution', { params: { task_id: taskId } })
}

export async function fetchTopKeywords(limit?: number) {
  return http('/api/dashboard/top-keywords', { params: { limit: limit || 10 } })
}

export interface BargainItem {
  title: string
  price: number
  reference_price: number
  premium_rate: number
  link: string
  image: string
  platform: string
  keyword: string
}

export async function fetchBargainLeaderboard(limit?: number): Promise<BargainItem[]> {
  return http('/api/dashboard/bargain-leaderboard', { params: { limit: limit || 10 } })
}

export async function fetchProfitSummary(): Promise<any> {
  return http('/api/profit/summary')
}

export async function fetchDailyProfit(days?: number): Promise<any> {
  return http('/api/profit/daily-trend', { params: { days } })
}

export async function fetchInventorySummary(): Promise<any> {
  return http('/api/inventory/summary')
}

export async function fetchAgingAlerts(days?: number): Promise<any> {
  return http('/api/inventory/aging-alerts', { params: { days } })
}

export async function fetchTeamPerformance(): Promise<any> {
  return http('/api/team/performance')
}

export async function fetchProfitByKeyword(): Promise<any> {
  return http('/api/profit/by-keyword')
}

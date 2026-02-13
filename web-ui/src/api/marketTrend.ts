import { http } from './http'

export interface TrendPoint {
  date: string
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  count: number
}

export interface MarketTrendResponse {
  keyword: string
  days: number
  trend: TrendPoint[]
}

export async function getMarketTrend(keyword: string, days: number = 30): Promise<MarketTrendResponse> {
  return http('/api/results/market-trend', { params: { keyword, days } })
}

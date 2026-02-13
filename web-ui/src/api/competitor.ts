import { http } from './http'

export interface SellerItem {
  title: string
  price: number
  item_link: string
  crawl_time: string
}

export interface SellerData {
  seller_name: string
  item_count: number
  avg_price: number
  min_price: number
  max_price: number
  items: SellerItem[]
}

export interface CompetitorAnalysis {
  keyword: string
  total_sellers: number
  total_items: number
  sellers: SellerData[]
  price_stats: { avg: number; min: number; max: number }
}

export async function getCompetitorAnalysis(keyword: string): Promise<CompetitorAnalysis> {
  return http('/api/results/competitor-analysis', { params: { keyword } })
}

import { http } from './http'

export interface CategoryOverview {
  id: string
  category_name: string
  keywords: string[]
  total_items: number
  market_price: number
  median_price: number
  avg_premium_rate: number
  good_deal_count: number
  purchase_range: [number | null, number | null]
  new_price?: number
}

export interface PriceBin {
  range_low: number
  range_high: number
  count: number
  label: string
}

export interface DistributionData {
  bins: PriceBin[]
  reference_lines: {
    market_price?: number
    new_price?: number
    purchase_ideal?: number
    purchase_upper?: number
  }
}

export async function getPremiumMapOverview(): Promise<CategoryOverview[]> {
  return http('/api/results/premium-map/overview')
}

export async function getPremiumDistribution(keyword: string): Promise<DistributionData> {
  return http('/api/results/premium-map/distribution', { params: { keyword } })
}

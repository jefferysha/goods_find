export interface MarketPrice {
  id: string
  task_id: number
  keyword: string
  reference_price: number
  fair_used_price?: number | null
  condition: 'new' | 'like_new' | 'good' | 'fair'
  category: string
  platform: string
  source: string
  note: string
  created_at: string
  updated_at: string
}

export interface BatchStats {
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  total_count: number
  percentile: number
}

export interface PriceAnalysis {
  item_id: string
  item_price: number
  reference_price: number | null
  premium_rate: number | null
  price_level: 'low_price' | 'fair' | 'slight_premium' | 'high_premium' | 'unknown'
  batch_stats: BatchStats
}

export interface PremiumThresholds {
  task_id: number | null
  low_price_max: number
  fair_max: number
  slight_premium_max: number
}

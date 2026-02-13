export interface FeeTemplate {
  shipping_fee: number
  refurbish_fee: number
  platform_fee_rate: number
  other_fee: number
}

export interface PriceBookEntry {
  id: string
  category_name: string
  keywords: string[]
  new_price?: number
  market_price?: number
  market_price_source: 'manual' | 'auto_7d_median'
  target_sell_price?: number
  fees: FeeTemplate
  min_profit_rate: number
  ideal_profit_rate: number
  platform: string
  note: string
  created_at: string
  updated_at: string
  total_fees?: number
  purchase_ideal?: number
  purchase_upper?: number
  purchase_range?: [number | null, number | null]
}

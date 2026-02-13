export type PurchaseStatus = 'new' | 'contacting' | 'negotiating' | 'purchased' | 'abandoned'

export interface PurchaseItem {
  id: number
  item_id: string
  title: string
  price: number
  image_url?: string
  item_link?: string
  platform: string
  keyword: string
  price_book_id?: number
  estimated_profit?: number
  estimated_profit_rate?: number
  purchase_range_low?: number
  purchase_range_high?: number
  status: PurchaseStatus
  assignee?: string
  actual_price?: number
  note?: string
  created_at: string
  updated_at: string
}

export interface PurchaseStats {
  total: number
  by_status: Record<PurchaseStatus, number>
  by_assignee: Record<string, number>
  total_estimated_profit: number
  total_actual_cost: number
}

export interface PurchaseFilters {
  status?: PurchaseStatus
  assignee?: string
}

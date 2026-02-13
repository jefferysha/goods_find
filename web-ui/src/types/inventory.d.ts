export type InventoryStatus = 'in_stock' | 'refurbishing' | 'listed' | 'sold' | 'returned'

export interface InventoryItem {
  id: number
  title: string
  keyword: string
  platform: string
  purchase_price: number
  shipping_fee: number
  refurbish_fee: number
  platform_fee: number
  other_fee: number
  total_cost: number
  listing_price?: number
  status: InventoryStatus
  assignee?: string
  purchase_item_id?: number
  aging_days?: number
  note?: string
  created_at: string
  updated_at: string
}

export interface InventorySummary {
  total_count: number
  total_cost: number
  estimated_value: number
  by_status: Record<InventoryStatus, number>
  by_assignee: Record<string, { count: number; cost: number }>
}

export interface AgingAlert {
  id: number
  title: string
  aging_days: number
  total_cost: number
  listing_price?: number
  status: InventoryStatus
  assignee?: string
}

export interface InventoryFilters {
  status?: InventoryStatus
  assignee?: string
  keyword?: string
}

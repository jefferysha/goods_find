import type { PurchaseItem } from './purchase'

export interface TeamMember {
  user_id: number
  username: string
  display_name: string
  role: 'admin' | 'member'
  focus_keywords: string[]
  avatar_url?: string
}

export interface TeamPerformance {
  user_id: number
  username: string
  display_name: string
  purchased_count: number
  sold_count: number
  revenue: number
  cost: number
  profit: number
  profit_rate: number
}

export interface InventorySummary {
  on_sale: number
  refurbishing: number
  age_warning: number
}

export interface WorkspaceData {
  member: TeamMember
  todos: PurchaseItem[]
  inventory_summary: InventorySummary
  performance: TeamPerformance
  recent_bargains: any[]
}

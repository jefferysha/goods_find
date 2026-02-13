export interface SaleRecord {
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
  sold_price: number
  sold_channel: string
  net_profit: number
  profit_rate: number
  assignee?: string
  sold_at: string
}

export interface ProfitSummary {
  total_sold: number
  total_revenue: number
  total_cost: number
  net_profit: number
  avg_profit_rate: number
  period_start?: string
  period_end?: string
}

export interface KeywordProfit {
  keyword: string
  sold_count: number
  total_revenue: number
  total_cost: number
  net_profit: number
  avg_profit_rate: number
}

export interface AssigneeProfit {
  assignee: string
  sold_count: number
  total_revenue: number
  total_cost: number
  net_profit: number
  avg_profit_rate: number
}

export interface DailyProfit {
  date: string
  sold_count: number
  revenue: number
  cost: number
  profit: number
}

export interface ProfitFilters {
  start_date?: string
  end_date?: string
  keyword?: string
  assignee?: string
}

export interface PriceHistoryEntry {
  item_id: string
  price: number
  crawl_time: string
  task_name: string
}

export interface PriceHistory {
  item_id: string
  title: string
  entries: PriceHistoryEntry[]
  price_change: number | null
  price_change_rate: number | null
}

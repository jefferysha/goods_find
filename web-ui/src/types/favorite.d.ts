export interface Favorite {
  id: string
  item_id: string
  task_id: number
  item_snapshot: Record<string, any>
  note: string
  created_at: string
}

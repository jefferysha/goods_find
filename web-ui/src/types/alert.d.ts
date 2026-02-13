export interface AlertRule {
  id: string
  task_id: number | null
  name: string
  enabled: boolean
  conditions: AlertCondition[]
  channels: string[]
  created_at: string
  updated_at: string
}

export interface AlertCondition {
  field: 'price' | 'premium_rate' | 'ai_score'
  operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq'
  value: number
}

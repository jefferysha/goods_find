import { http } from './http'
import type { AlertRule } from '@/types/alert'

export async function fetchAlertRules(taskId?: number): Promise<AlertRule[]> {
  return http('/api/alerts/rules', { params: { task_id: taskId } })
}

export async function createAlertRule(data: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>) {
  return http('/api/alerts/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateAlertRule(id: string, data: Partial<AlertRule>) {
  return http(`/api/alerts/rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteAlertRule(id: string) {
  return http(`/api/alerts/rules/${id}`, { method: 'DELETE' })
}

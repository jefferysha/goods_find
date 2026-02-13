import { useState, useCallback } from 'react'
import { fetchAlertRules, createAlertRule, updateAlertRule, deleteAlertRule } from '@/api/alerts'
import type { AlertRule } from '@/types/alert'

export function useAlerts() {
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (taskId?: number) => {
    setLoading(true)
    try {
      setRules(await fetchAlertRules(taskId))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(
    async (data: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>) => {
      await createAlertRule(data)
      await load()
    },
    [load],
  )

  const update = useCallback(
    async (id: string, data: Partial<AlertRule>) => {
      await updateAlertRule(id, data)
      await load()
    },
    [load],
  )

  const remove = useCallback(
    async (id: string) => {
      await deleteAlertRule(id)
      await load()
    },
    [load],
  )

  return { rules, loading, load, add, update, remove }
}

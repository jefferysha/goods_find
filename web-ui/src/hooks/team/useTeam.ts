import { useState, useCallback } from 'react'
import type { TeamMember, TeamPerformance } from '@/types/team'
import * as teamApi from '@/api/team'

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [performance, setPerformance] = useState<TeamPerformance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      const data = await teamApi.getTeamMembers()
      setMembers(Array.isArray(data) ? data : [])
    } catch (e) {
      if (e instanceof Error) setError(e)
    }
  }, [])

  const fetchPerformance = useCallback(
    async (params?: { user_id?: number; start_date?: string; end_date?: string }) => {
      try {
        const data = await teamApi.getTeamPerformance(params)
        setPerformance(Array.isArray(data) ? data : [])
      } catch (e) {
        if (e instanceof Error) setError(e)
      }
    },
    [],
  )

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([fetchMembers(), fetchPerformance()])
    } finally {
      setIsLoading(false)
    }
  }, [fetchMembers, fetchPerformance])

  const updateMember = useCallback(
    async (userId: number, data: Partial<TeamMember>) => {
      const updated = await teamApi.updateMember(userId, data)
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, ...updated } : m)),
      )
      return updated
    },
    [],
  )

  return {
    members,
    performance,
    isLoading,
    error,
    refresh,
    fetchPerformance,
    updateMember,
  }
}

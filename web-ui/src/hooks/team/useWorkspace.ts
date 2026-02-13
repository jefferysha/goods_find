import { useState, useCallback } from 'react'
import type { WorkspaceData } from '@/types/team'
import { getWorkspace } from '@/api/team'

export function useWorkspace() {
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async (userId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getWorkspace(userId)
      setWorkspaceData(data)
    } catch (e) {
      if (e instanceof Error) setError(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    workspaceData,
    isLoading,
    error,
    refresh,
  }
}

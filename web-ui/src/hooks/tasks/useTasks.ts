import { useState, useEffect, useCallback, useRef } from 'react'
import type { Task, TaskGenerateRequest, TaskUpdate } from '@/types/task'
import * as taskApi from '@/api/tasks'
import { useWebSocket } from '@/hooks/shared/useWebSocket'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [stoppingTaskIds, setStoppingTaskIds] = useState<Set<number>>(new Set())
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await taskApi.getAllTasks()
      setTasks(data)
    } catch (e) {
      if (e instanceof Error) setError(e)
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Real-time updates via WebSocket
  const handleTasksUpdated = useCallback(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleTaskStatusChanged = useCallback(
    (data: { id: number; is_running: boolean }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === data.id ? { ...t, is_running: data.is_running } : t)),
      )
    },
    [],
  )

  useWebSocket('tasks_updated', handleTasksUpdated)
  useWebSocket('task_status_changed', handleTaskStatusChanged)

  const createTask = useCallback(
    async (data: TaskGenerateRequest) => {
      setIsLoading(true)
      setError(null)
      try {
        await taskApi.createTaskWithAI(data)
        await fetchTasks()
      } catch (e) {
        if (e instanceof Error) setError(e)
        console.error(e)
        throw e
      } finally {
        setIsLoading(false)
      }
    },
    [fetchTasks],
  )

  const updateTask = useCallback(async (taskId: number, data: TaskUpdate) => {
    setError(null)
    try {
      const updatedTask = await taskApi.updateTask(taskId, data)
      setTasks((prev) => {
        const index = prev.findIndex((t) => t.id === updatedTask.id)
        if (index >= 0) {
          const next = [...prev]
          next[index] = { ...next[index], ...updatedTask }
          return next
        }
        return [...prev, updatedTask]
      })
    } catch (e) {
      if (e instanceof Error) setError(e)
      console.error(e)
      throw e
    }
  }, [])

  const removeTask = useCallback(
    async (taskId: number) => {
      try {
        await taskApi.deleteTask(taskId)
        await fetchTasks()
      } catch (e) {
        if (e instanceof Error) setError(e)
        console.error(e)
        throw e
      }
    },
    [fetchTasks],
  )

  const startTask = useCallback(async (taskId: number) => {
    setIsLoading(true)
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_running: true } : t)))
    try {
      await taskApi.startTask(taskId)
    } catch (e) {
      // Revert optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_running: false } : t)),
      )
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopTask = useCallback(async (taskId: number) => {
    setIsLoading(true)
    setStoppingTaskIds((prev) => new Set(prev).add(taskId))
    try {
      await taskApi.stopTask(taskId)
    } catch (e) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setStoppingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
      setIsLoading(false)
    }
  }, [])

  // Load tasks on mount
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    isLoading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    removeTask,
    startTask,
    stopTask,
    stoppingTaskIds,
  }
}

import { useState, useCallback, useEffect, useRef } from 'react'
import * as logsApi from '@/api/logs'

const MAX_LOG_CHARS = 200_000
const TRIM_LOG_CHARS = 150_000
const TRIM_NOTICE = '...日志过长已截断，仅保留最新内容...'

export function useLogs() {
  const [logs, setLogs] = useState('')
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingHistory, setIsFetchingHistory] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const currentPosRef = useRef(0)
  const historyOffsetRef = useRef(0)
  const refreshIntervalRef = useRef<number | null>(null)
  const currentTaskIdRef = useRef(currentTaskId)
  const isLoadingRef = useRef(isLoading)
  currentTaskIdRef.current = currentTaskId
  isLoadingRef.current = isLoading

  function appendLogs(content: string) {
    if (!content) return
    setLogs((prev) => {
      const next = prev + content
      if (next.length > MAX_LOG_CHARS) {
        const tail = next.slice(-TRIM_LOG_CHARS)
        return `${TRIM_NOTICE}\n${tail}`
      }
      return next
    })
  }

  const fetchLogs = useCallback(async () => {
    if (isLoadingRef.current) return
    if (currentTaskIdRef.current === null) return
    setIsLoading(true)
    try {
      const data = await logsApi.getLogs(currentPosRef.current, currentTaskIdRef.current)
      if (data.new_pos < currentPosRef.current) {
        // Log file rotated or cleared
        setLogs('')
      }
      if (data.new_content) {
        appendLogs(data.new_content)
      }
      currentPosRef.current = data.new_pos
    } catch (e) {
      if (e instanceof Error) setError(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadLatest = useCallback(async (limitLines: number = 50) => {
    if (currentTaskIdRef.current === null) return
    setIsFetchingHistory(true)
    try {
      const data = await logsApi.getLogTail(currentTaskIdRef.current, 0, limitLines)
      setLogs(data.content || '')
      historyOffsetRef.current = data.next_offset
      setHasMoreHistory(data.has_more)
      currentPosRef.current = data.new_pos
    } catch (e) {
      if (e instanceof Error) setError(e)
    } finally {
      setIsFetchingHistory(false)
    }
  }, [])

  const loadPrevious = useCallback(async (limitLines: number = 50) => {
    if (currentTaskIdRef.current === null) return
    setIsFetchingHistory(true)
    try {
      const data = await logsApi.getLogTail(
        currentTaskIdRef.current,
        historyOffsetRef.current,
        limitLines,
      )
      if (data.content) {
        setLogs((prev) => (prev ? `${data.content}\n${prev}` : data.content))
      }
      historyOffsetRef.current = data.next_offset
      setHasMoreHistory(data.has_more)
      currentPosRef.current = data.new_pos
    } catch (e) {
      if (e instanceof Error) setError(e)
    } finally {
      setIsFetchingHistory(false)
    }
  }, [])

  const clearLogs = useCallback(async () => {
    if (currentTaskIdRef.current === null) return
    try {
      await logsApi.clearLogs(currentTaskIdRef.current)
      setLogs('')
      currentPosRef.current = 0
      historyOffsetRef.current = 0
      setHasMoreHistory(false)
    } catch (e) {
      if (e instanceof Error) setError(e)
      throw e
    }
  }, [])

  const startAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) return
    fetchLogs()
    refreshIntervalRef.current = window.setInterval(fetchLogs, 2000)
    setIsAutoRefresh(true)
  }, [fetchLogs])

  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
    setIsAutoRefresh(false)
  }, [])

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefresh((prev) => {
      if (prev) {
        // currently on → stop
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
          refreshIntervalRef.current = null
        }
        return false
      } else {
        // currently off → start
        fetchLogs()
        refreshIntervalRef.current = window.setInterval(fetchLogs, 2000)
        return true
      }
    })
  }, [fetchLogs])

  const setTaskId = useCallback((taskId: number | null) => {
    if (currentTaskIdRef.current === taskId) return
    setCurrentTaskId(taskId)
    setLogs('')
    currentPosRef.current = 0
    historyOffsetRef.current = 0
    setHasMoreHistory(false)
  }, [])

  // Auto-refresh lifecycle
  useEffect(() => {
    startAutoRefresh()
    return () => {
      stopAutoRefresh()
    }
  }, [startAutoRefresh, stopAutoRefresh])

  return {
    logs,
    isAutoRefresh,
    isLoading,
    isFetchingHistory,
    hasMoreHistory,
    error,
    fetchLogs,
    clearLogs,
    toggleAutoRefresh,
    setTaskId,
    loadLatest,
    loadPrevious,
  }
}

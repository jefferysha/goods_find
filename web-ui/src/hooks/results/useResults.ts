import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { ResultItem } from '@/types/result'
import * as resultsApi from '@/api/results'
import type { GetResultContentParams } from '@/api/results'
import * as tasksApi from '@/api/tasks'
import { useWebSocket } from '@/hooks/shared/useWebSocket'

export interface ResultFilters {
  recommended_only: boolean
  sort_by: 'crawl_time' | 'publish_time' | 'price'
  sort_order: 'asc' | 'desc'
}

export function useResults() {
  // State: 现在用 keywords 而非 files
  const [keywords, setKeywords] = useState<string[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [results, setResults] = useState<ResultItem[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [filters, setFilters] = useState<ResultFilters>({
    recommended_only: false,
    sort_by: 'crawl_time',
    sort_order: 'desc',
  })
  const [taskNameByKeyword, setTaskNameByKeyword] = useState<Record<string, string>>({})
  const [isOptionsReady, setIsOptionsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const hasFetchedKeywordsRef = useRef(false)
  const hasFetchedTasksRef = useRef(false)
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedKeywordRef = useRef(selectedKeyword)
  selectedKeywordRef.current = selectedKeyword

  const READY_DELAY_MS = 200

  function normalizeKeyword(value: string) {
    return value.trim().toLowerCase()
  }

  function scheduleOptionsReady() {
    if (isOptionsReady || !hasFetchedKeywordsRef.current || !hasFetchedTasksRef.current) return
    if (readyTimerRef.current) return
    readyTimerRef.current = setTimeout(() => {
      setIsOptionsReady(true)
      readyTimerRef.current = null
    }, READY_DELAY_MS)
  }

  const fetchKeywords = useCallback(async () => {
    try {
      const keywordList = await resultsApi.getKeywords()
      setKeywords(keywordList)

      setSelectedKeyword((prev) => {
        if (prev && keywordList.includes(prev)) return prev

        const lastSelected = localStorage.getItem('lastSelectedKeyword')
        if (lastSelected && keywordList.includes(lastSelected)) return lastSelected

        return keywordList[0] || null
      })
    } catch (e) {
      if (e instanceof Error) setError(e)
    } finally {
      hasFetchedKeywordsRef.current = true
      scheduleOptionsReady()
    }
  }, [])

  const fetchResults = useCallback(
    async (keyword: string | null, currentFilters: ResultFilters) => {
      if (!keyword) {
        setResults([])
        setTotalItems(0)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const params: GetResultContentParams = {
          ...currentFilters,
          page: 1,
          limit: 100,
        }
        const data = await resultsApi.getResultItems(keyword, params)
        setResults(data.items)
        setTotalItems(data.total_items)
      } catch (e) {
        if (e instanceof Error) setError(e)
        setResults([])
        setTotalItems(0)
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const fetchTaskNameMap = useCallback(async () => {
    try {
      const tasks = await tasksApi.getAllTasks()
      const mapping: Record<string, string> = {}
      tasks.forEach((task) => {
        if (task.keyword) {
          mapping[normalizeKeyword(task.keyword)] = task.task_name
        }
      })
      setTaskNameByKeyword(mapping)
    } catch (e) {
      if (e instanceof Error) setError(e)
    } finally {
      hasFetchedTasksRef.current = true
      scheduleOptionsReady()
    }
  }, [])

  // Real-time updates
  const handleResultsUpdated = useCallback(async () => {
    const oldKeyword = selectedKeywordRef.current
    await fetchKeywords()
    if (selectedKeywordRef.current && selectedKeywordRef.current === oldKeyword) {
      fetchResults(selectedKeywordRef.current, filters)
    }
  }, [fetchKeywords, fetchResults, filters])

  const handleTasksUpdated = useCallback(() => {
    fetchTaskNameMap()
  }, [fetchTaskNameMap])

  useWebSocket('results_updated', handleResultsUpdated)
  useWebSocket('tasks_updated', handleTasksUpdated)

  const refreshResults = useCallback(async () => {
    const current = selectedKeywordRef.current
    await fetchKeywords()
    if (selectedKeywordRef.current && selectedKeywordRef.current === current) {
      await fetchResults(selectedKeywordRef.current, filters)
    }
  }, [fetchKeywords, fetchResults, filters])

  const deleteSelected = useCallback(
    async (keyword?: string) => {
      const target = keyword || selectedKeywordRef.current
      if (!target) return
      setIsLoading(true)
      setError(null)
      try {
        await resultsApi.deleteResultData(target)
        if (selectedKeywordRef.current === target) {
          const lastSelected = localStorage.getItem('lastSelectedKeyword')
          if (lastSelected === target) {
            localStorage.removeItem('lastSelectedKeyword')
          }
        }
        await fetchKeywords()
      } catch (e) {
        if (e instanceof Error) setError(e)
        throw e
      } finally {
        setIsLoading(false)
      }
    },
    [fetchKeywords],
  )

  const exportCsv = useCallback((keyword?: string) => {
    const target = keyword || selectedKeywordRef.current
    if (!target) return
    resultsApi.exportResultCsv(target)
  }, [])

  // Watch selectedKeyword & filters → re-fetch results
  useEffect(() => {
    fetchResults(selectedKeyword, filters)
  }, [selectedKeyword, filters, fetchResults])

  // Persist selected keyword to localStorage
  useEffect(() => {
    if (selectedKeyword) {
      localStorage.setItem('lastSelectedKeyword', selectedKeyword)
    }
  }, [selectedKeyword])

  // Computed: keyword options with task name labels
  const keywordOptions = useMemo(
    () =>
      keywords.map((kw) => {
        const normalized = normalizeKeyword(kw)
        const taskName = taskNameByKeyword[normalized]
        return {
          value: kw,
          label: taskName ? `${taskName} (${kw})` : kw,
        }
      }),
    [keywords, taskNameByKeyword],
  )

  // Initial load
  useEffect(() => {
    fetchKeywords()
    fetchTaskNameMap()
  }, [fetchKeywords, fetchTaskNameMap])

  return {
    keywords,
    selectedKeyword,
    setSelectedKeyword,
    results,
    totalItems,
    filters,
    setFilters,
    isLoading,
    error,
    refreshResults,
    deleteSelected,
    exportCsv,
    keywordOptions,
    isOptionsReady,
  }
}

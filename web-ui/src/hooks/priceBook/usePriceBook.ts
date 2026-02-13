import { useState, useEffect, useCallback } from 'react'
import type { PriceBookEntry } from '@/types/priceBook'
import * as priceBookApi from '@/api/priceBook'

export function usePriceBook() {
  const [entries, setEntries] = useState<PriceBookEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await priceBookApi.getAllEntries()
      setEntries(data)
    } catch (e) {
      if (e instanceof Error) setError(e)
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createEntry = useCallback(
    async (data: Partial<PriceBookEntry>) => {
      setError(null)
      try {
        await priceBookApi.createEntry(data)
        await fetchEntries()
      } catch (e) {
        if (e instanceof Error) setError(e)
        console.error(e)
        throw e
      }
    },
    [fetchEntries],
  )

  const updateEntry = useCallback(
    async (entryId: string, data: Partial<PriceBookEntry>) => {
      setError(null)
      try {
        await priceBookApi.updateEntry(entryId, data)
        await fetchEntries()
      } catch (e) {
        if (e instanceof Error) setError(e)
        console.error(e)
        throw e
      }
    },
    [fetchEntries],
  )

  const deleteEntry = useCallback(
    async (entryId: string) => {
      setError(null)
      try {
        await priceBookApi.deleteEntry(entryId)
        await fetchEntries()
      } catch (e) {
        if (e instanceof Error) setError(e)
        console.error(e)
        throw e
      }
    },
    [fetchEntries],
  )

  const batchUpdate = useCallback(
    async (ids: string[], data: Record<string, unknown>) => {
      setError(null)
      try {
        const result = await priceBookApi.batchUpdate(ids, data)
        await fetchEntries()
        return result
      } catch (e) {
        if (e instanceof Error) setError(e)
        console.error(e)
        throw e
      }
    },
    [fetchEntries],
  )

  const autoUpdatePrices = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await priceBookApi.autoUpdateMarketPrices()
      await fetchEntries()
      return result
    } catch (e) {
      if (e instanceof Error) setError(e)
      console.error(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [fetchEntries])

  // Load entries on mount
  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return {
    entries,
    isLoading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    batchUpdate,
    autoUpdatePrices,
  }
}

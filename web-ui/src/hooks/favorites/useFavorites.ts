import { useState, useCallback } from 'react'
import { fetchFavorites, addFavorite, removeFavorite } from '@/api/favorites'
import type { Favorite } from '@/types/favorite'

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchFavorites()
      setFavorites(Array.isArray(res) ? res : (res as any)?.items ?? [])
    } catch (e) {
      console.error('Failed to load favorites', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const add = useCallback(
    async (data: Parameters<typeof addFavorite>[0]) => {
      await addFavorite(data)
      await load()
    },
    [load],
  )

  const remove = useCallback(
    async (id: string) => {
      await removeFavorite(id)
      await load()
    },
    [load],
  )

  return { favorites, loading, load, add, remove }
}

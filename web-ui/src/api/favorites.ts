import { http } from './http'
import type { Favorite } from '@/types/favorite'

export async function fetchFavorites(): Promise<Favorite[]> {
  return http('/api/favorites')
}

export async function addFavorite(data: { item_id: string; task_id: number; item_snapshot: Record<string, any>; note?: string }) {
  return http('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function removeFavorite(id: string) {
  return http(`/api/favorites/${id}`, { method: 'DELETE' })
}

export async function compareFavorites(ids: string[]) {
  return http('/api/favorites/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}

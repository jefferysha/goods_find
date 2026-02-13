import type { ResultItem } from '@/types/result'
import { http } from './http'

export interface GetResultContentParams {
  recommended_only?: boolean
  sort_by?: 'crawl_time' | 'publish_time' | 'price'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export async function getKeywords(): Promise<string[]> {
  const data = await http('/api/results/keywords')
  return data.keywords || []
}

export async function deleteResultData(keyword: string): Promise<{ message: string }> {
  return await http('/api/results/data', {
    method: 'DELETE',
    params: { keyword },
  })
}

export async function getResultItems(
  keyword: string,
  params: GetResultContentParams = {}
): Promise<{ total_items: number; page: number; limit: number; items: ResultItem[] }> {
  return await http('/api/results/items', {
    params: { keyword, ...params } as Record<string, any>,
  })
}

export function exportResultCsv(keyword: string): void {
  const url = `/api/results/export?keyword=${encodeURIComponent(keyword)}`
  window.open(url, '_blank')
}

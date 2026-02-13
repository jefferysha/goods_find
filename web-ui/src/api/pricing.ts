import { http } from './http'
import type { MarketPrice, PriceAnalysis, BatchStats, PremiumThresholds } from '@/types/pricing'

export async function fetchMarketPrices(taskId: number): Promise<MarketPrice[]> {
  return http('/api/pricing/market-prices', { params: { task_id: taskId } })
}

export async function createMarketPrice(data: Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'>) {
  return http('/api/pricing/market-prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateMarketPrice(id: string, data: Partial<MarketPrice>) {
  return http(`/api/pricing/market-prices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteMarketPrice(id: string) {
  return http(`/api/pricing/market-prices/${id}`, { method: 'DELETE' })
}

export async function fetchPriceAnalysis(taskId: number, runId?: string): Promise<PriceAnalysis[]> {
  return http('/api/pricing/analysis', { params: { task_id: taskId, run_id: runId } })
}

export async function fetchBatchStats(taskId: number, runId?: string): Promise<BatchStats> {
  return http('/api/pricing/batch-stats', { params: { task_id: taskId, run_id: runId } })
}

export async function fetchThresholds(taskId?: number): Promise<PremiumThresholds> {
  return http('/api/pricing/thresholds', { params: { task_id: taskId } })
}

export async function updateThresholds(data: PremiumThresholds) {
  return http('/api/pricing/thresholds', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

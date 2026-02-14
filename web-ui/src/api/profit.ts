import { http } from './http'
import type {
  SaleRecord,
  ProfitSummary,
  KeywordProfit,
  AssigneeProfit,
  DailyProfit,
  ProfitFilters,
} from '@/types/profit'

export async function getSaleRecords(filters?: ProfitFilters): Promise<SaleRecord[]> {
  return http('/api/profit/records', { params: filters as Record<string, any> })
}

export async function getProfitSummary(filters?: ProfitFilters): Promise<ProfitSummary> {
  return http('/api/profit/summary', { params: filters as Record<string, any> })
}

export async function getProfitByKeyword(filters?: ProfitFilters): Promise<KeywordProfit[]> {
  return http('/api/profit/by-keyword', { params: filters as Record<string, any> })
}

export async function getProfitByAssignee(filters?: ProfitFilters): Promise<AssigneeProfit[]> {
  return http('/api/profit/by-assignee', { params: filters as Record<string, any> })
}

export async function getDailyProfit(days?: number, assignee?: string): Promise<DailyProfit[]> {
  return http('/api/profit/daily-trend', { params: { days, assignee } })
}

export interface ROIOverview {
  total_cost: number
  total_revenue: number
  total_profit: number
  overall_roi: number
  avg_holding_days: number
  count: number
  keyword_ranking: Array<{
    keyword: string
    total_cost: number
    total_profit: number
    roi: number
    sold_count?: number
  }>
}

export interface ItemROI {
  purchase_price: number
  total_cost: number
  effective_price: number
  profit: number
  roi: number
  daily_roi: number
  annualized_roi: number
  holding_days: number
  estimated: boolean
  item_id: string
}

export async function getROIOverview(filters?: ProfitFilters): Promise<ROIOverview> {
  return http('/api/profit/roi-overview', { params: filters as Record<string, any> })
}

export async function getItemROI(itemId: string): Promise<ItemROI> {
  return http(`/api/profit/roi-item/${itemId}`)
}
